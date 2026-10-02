const { Kafka, logLevel } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const KAFKA_BROKERS = process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'];
const CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'api-gateway-service';
const USE_MOCK_KAFKA = process.env.USE_MOCK_KAFKA === 'true';

// Topics
const TOPICS = {
  REQUESTS_RAW: process.env.TOPIC_REQUESTS_RAW || 'api.requests.raw',
  RATE_LIMIT_VIOLATIONS: process.env.TOPIC_RATE_LIMIT_VIOLATIONS || 'api.rate-limit.violations',
  HEALTH_CHECKS: process.env.TOPIC_HEALTH_CHECKS || 'api.health.checks',
  REQUESTS_DLQ: process.env.TOPIC_REQUESTS_DLQ || 'api.requests.dlq',
  HEALTH_DLQ: process.env.TOPIC_HEALTH_DLQ || 'api.health.dlq'
};

let producer = null;
let isConnected = false;
const inMemoryEvents = []; // Fallback queue for testing / offline mode

async function initKafka() {
  if (USE_MOCK_KAFKA) {
    console.log('[Kafka] USE_MOCK_KAFKA is true. Operating in Mock Kafka mode.');
    isConnected = true;
    return;
  }

  try {
    const kafka = new Kafka({
      clientId: CLIENT_ID,
      brokers: KAFKA_BROKERS,
      logLevel: logLevel.NOTHING,
      retry: {
        initialRetryTime: 300,
        retries: 3
      }
    });

    producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000
    });

    await producer.connect();
    isConnected = true;
    console.log(`[Kafka] Connected successfully to brokers: ${KAFKA_BROKERS.join(', ')}`);
  } catch (error) {
    console.warn(`[Kafka] Could not connect to Kafka (${error.message}). Falling back to in-memory mock queue.`);
    isConnected = false;
    producer = null;
  }
}

/**
 * Publish an event to a Kafka topic asynchronously with UUID & timestamp
 * @param {string} topic - Target Kafka topic
 * @param {object} message - Message payload
 * @param {string} [key] - Optional partition key (e.g., apiId or userId)
 */
async function publishEvent(topic, message, key = null) {
  const event = {
    eventId: message.eventId || uuidv4(),
    timestamp: message.timestamp || new Date().toISOString(),
    ...message
  };

  if (producer && isConnected) {
    try {
      await producer.send({
        topic,
        messages: [
          {
            key: key ? String(key) : event.eventId,
            value: JSON.stringify(event),
            headers: {
              'event-id': event.eventId,
              'event-type': topic,
              'producer-service': CLIENT_ID,
              'sent-timestamp': event.timestamp
            }
          }
        ]
      });
      const { kafkaEventsEmittedTotal } = require('./metrics');
      kafkaEventsEmittedTotal.inc({ topic, status: 'success' });
      return { status: 'PUBLISHED_KAFKA', eventId: event.eventId, topic };
    } catch (err) {
      console.error(`[Kafka] Failed to publish event to ${topic}: ${err.message}. Queuing in memory.`);
      try {
        const { kafkaEventsEmittedTotal } = require('./metrics');
        kafkaEventsEmittedTotal.inc({ topic, status: 'error' });
      } catch (ignored) {}
    }
  }

  // Fallback in-memory store
  inMemoryEvents.push({ topic, key, event, timestamp: Date.now() });
  if (inMemoryEvents.length > 500) inMemoryEvents.shift(); // Bound memory
  try {
    const { kafkaEventsEmittedTotal } = require('./metrics');
    kafkaEventsEmittedTotal.inc({ topic, status: 'mock_fallback' });
  } catch (ignored) {}
  return { status: 'PUBLISHED_MOCK', eventId: event.eventId, topic };
}

async function disconnectKafka() {
  if (producer && isConnected) {
    try {
      await producer.disconnect();
      console.log('[Kafka] Disconnected cleanly.');
    } catch (err) {
      console.error('[Kafka] Error during disconnect:', err.message);
    }
  }
}

function getInMemoryEvents() {
  return inMemoryEvents;
}

module.exports = {
  TOPICS,
  initKafka,
  publishEvent,
  disconnectKafka,
  getInMemoryEvents,
  isKafkaConnected: () => isConnected
};
