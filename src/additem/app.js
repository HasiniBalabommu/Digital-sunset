const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*"
};

exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub || "test-user";
    const body = JSON.parse(event.body);

    const item = {
      userId,
      itemId: randomUUID(),
      itemName: body.itemName,
      checkInFrequencyDays: body.checkInFrequencyDays || 30,
      lastCheckIn: new Date().toISOString(),
      escalationStage: "none",
      trustedContactEmail: body.trustedContactEmail || null,
      actionOnEscalation: body.actionOnEscalation || "notify_contact",
      createdAt: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: item
    }));

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify(item)
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Failed to add item" })
    };
  }
};