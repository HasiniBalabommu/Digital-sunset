const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { SFNClient, StartExecutionCommand } = require("@aws-sdk/client-sfn");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const sfnClient = new SFNClient({});

exports.handler = async () => {
  const result = await docClient.send(new ScanCommand({
    TableName: process.env.TABLE_NAME
  }));

  const now = new Date();
  const overdueItems = result.Items.filter(item => {
    const lastCheckIn = new Date(item.lastCheckIn);
    const daysSince = (now - lastCheckIn) / (1000 * 60 * 60 * 24);
    return daysSince > item.checkInFrequencyDays && item.escalationStage === "none";
  });

  console.log(`Found ${overdueItems.length} overdue item(s)`);

  for (const item of overdueItems) {
    await sfnClient.send(new StartExecutionCommand({
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      input: JSON.stringify(item)
    }));
  }

  return { checked: result.Items.length, overdue: overdueItems.length };
};
