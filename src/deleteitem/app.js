const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*"
};

exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub || "test-user";
    const itemId = event.pathParameters.id;

    await docClient.send(new DeleteCommand({
      TableName: process.env.TABLE_NAME,
      Key: { userId, itemId }
    }));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ deleted: itemId })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Failed to delete item" })
    };
  }
};