const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const sesClient = new SESClient({});
const SENDER_EMAIL = process.env.SENDER_EMAIL;

exports.handler = async (event) => {
  const { itemName, userId, trustedContactEmail, stage } = event;

  let recipient, subject, message;

  if (stage === "gentle") {
    recipient = SENDER_EMAIL; // sending to yourself for now, since Cognito/real user email isn't wired up yet
    subject = `Still using ${itemName}?`;
    message = `Hi, just checking - are you still using "${itemName}"? Tap check-in if yes.`;
  } else if (stage === "urgent") {
    recipient = SENDER_EMAIL;
    subject = `Urgent: ${itemName} still not confirmed`;
    message = `You haven't confirmed "${itemName}" in a while. Please check in soon or it will be escalated.`;
  } else if (stage === "escalate") {
    recipient = trustedContactEmail || SENDER_EMAIL;
    subject = `Action needed: ${itemName} was not confirmed`;
    message = `"${itemName}" was not confirmed by the owner after multiple reminders. This is the final notice.`;
  }

  await sesClient.send(new SendEmailCommand({
    Source: SENDER_EMAIL,
    Destination: { ToAddresses: [recipient] },
    Message: {
      Subject: { Data: subject },
      Body: { Text: { Data: message } }
    }
  }));

  return { ...event, escalationStage: stage === "gentle" ? "warned" : stage === "urgent" ? "escalated" : "actioned" };
};
