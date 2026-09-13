const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*"
};

exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub || "test-user";

    const result = await docClient.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId }
    }));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result.Items)
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Failed to list items" })
    };
  }
};