# Digital Sunset

A serverless app that tracks subscriptions/accounts you might forget about, and escalates reminders (gentle email → urgent email → notify a trusted contact) if you don't check in within a set time window.

## Problem it solves

People forget about inactive subscriptions, dormant accounts, or unused services that quietly drain money or become security risks. Digital Sunset lets you register anything you want monitored; if you don't check in within N days, it escalates automatically instead of silently doing nothing.

## Architecture

- **DynamoDB** (`TrackedItems`) — stores tracked items per user, pay-per-request billing
- **Lambda** (6 functions) — CheckIn, AddItem, ListItems, DeleteItem, Monitor, Escalation
- **Step Functions** — orchestrates the multi-day escalation workflow (gentle → wait → check → urgent → wait → check → escalate)
- **EventBridge** — triggers the daily Monitor scan (currently disabled during development)
- **SES** — sends the actual reminder emails
- **Cognito** — user authentication (Hosted UI, no custom login form needed)
- **API Gateway** — REST API, secured by a Cognito authorizer, CORS enabled for the frontend
- **AWS SAM** — the entire stack is defined as Infrastructure as Code in `template.yaml`

## Project structure

```
digital-sunset/
├── template.yaml              # SAM infrastructure definition
├── src/
│   ├── checkin/                # POST /items/{id}/checkin
│   ├── additem/                 # POST /items
│   ├── listitems/                # GET /items
│   ├── deleteitem/                # DELETE /items/{id}
│   ├── escalation/                # Sends gentle/urgent/final emails via SES
│   └── monitor/                    # Daily scan, starts Step Functions executions
├── statemachine/
│   └── escalation.asl.json    # Step Functions state machine (Amazon States Language)
├── frontend/
│   └── index.html               # Simple dashboard (no build tools required)
└── README.md
```

## Setup and deployment

### Prerequisites
- AWS account (Free Tier is enough)
- AWS CLI configured (`aws configure`)
- AWS SAM CLI installed

### Deploy
```bash
sam build
sam deploy --guided
```

Follow the prompts (stack name, region, confirm IAM role creation). On later deploys, just run `sam deploy`.

### Before your first deploy
1. Verify your sender email in **SES** (console → SES → Identities → Create identity).
2. Replace `hasini1607@gmail.com` in `template.yaml` (both places it appears under `EscalationFunction`) with your own verified email.
3. Pick a unique Cognito domain prefix — replace `digital-sunset-hasini` in `template.yaml` if that name is taken.

### After deploy
Grab these from the deploy Outputs:
- `ApiUrl`
- `UserPoolId`
- `UserPoolClientId`
- `CognitoDomain`

Update the `CONFIG` section at the top of `frontend/index.html` with these values.

### Create a test user (no signup form in this simple version)
```bash
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username you@example.com \
  --user-attributes Name=email,Value=you@example.com Name=email_verified,Value=true \
  --region ap-south-1

aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username you@example.com \
  --password "YourPassword123!" \
  --permanent \
  --region ap-south-1
```

### Run the frontend locally
```bash
cd frontend
npx serve -l 3000
```
Open http://localhost:3000

## Testing the escalation workflow without waiting days

Temporarily change both `"Seconds"` values in `statemachine/escalation.asl.json` (259200 and 432000) to something small like `60`, redeploy, then manually start an execution:

```bash
aws stepfunctions start-execution \
  --state-machine-arn "YOUR_STATE_MACHINE_ARN" \
  --input "{\"itemName\": \"Netflix Subscription\", \"userId\": \"test-user\", \"trustedContactEmail\": \"you@example.com\"}" \
  --region ap-south-1
```

Watch it run visually in the Step Functions console. Remember to revert the wait times back to real values (259200 / 432000) afterward.

## Enabling the daily monitor

The EventBridge schedule is disabled by default (`Enabled: false` in `template.yaml`) to avoid unexpected daily emails during development. Set it to `true` and redeploy once you're ready to run it for real.

## Cost

Runs entirely within AWS Free Tier at low usage — DynamoDB (pay-per-request), Lambda, Step Functions, API Gateway, SES, and Cognito all have generous free allowances that comfortably cover a personal-scale project like this. Expected cost: $0/month.

## Hardest part (for interviews)

Getting the Step Functions workflow to correctly resume or reset when a user checks in mid-escalation required careful thought about state transitions. Also spent real time debugging YAML indentation issues in the SAM template that caused confusing CloudFormation "circular dependency" and "undefined resource" errors — a good reminder that Infrastructure as Code is still code, and needs the same care with syntax as any other program.

## Possible next steps
- Move SES out of sandbox mode for production use (works for any recipient, not just verified addresses)
- Add a proper signup form instead of admin-created test users
- Add a "snooze" feature to pause an in-progress escalation without a full check-in
- Add a data export step before the final escalation action
