import { Queue, Worker, type Job } from 'bullmq';
import { getRedis } from '../config/redis.js';
import { config } from '../config/index.js';

const QUEUE_NAME = 'sms-otp';

export const smsOtpQueue = new Queue(QUEUE_NAME, {
  connection: getRedis() as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export interface SmsOtpPayload {
  mobile: string;
  otp: string;
  purpose: string;
}

export async function enqueueSmsOtp(data: SmsOtpPayload) {
  return smsOtpQueue.add('send-otp', data);
}

async function sendSms(mobile: string, message: string) {
  if (config.SMS_PROVIDER === 'mock') {
    console.log(`[SMS Mock] To: ${mobile}, Message: ${message}`);
    return;
  }

  if (config.SMS_PROVIDER === 'msg91' && config.MSG91_AUTH_KEY) {
    const url = 'https://api.msg91.com/api/v5/flow/';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authkey': config.MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: config.MSG91_SENDER_ID,
        mobiles: mobile,
        template_id: config.MSG91_TEMPLATE_ID,
        var1: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`SMS send failed: ${response.statusText}`);
    }
  }
}

const worker = new Worker<SmsOtpPayload>(
  QUEUE_NAME,
  async (job: Job<SmsOtpPayload>) => {
    const { mobile, otp, purpose } = job.data;

    let message: string;
    switch (purpose) {
      case 'password_reset':
        message = `Your eFPS OTP for password reset is: ${otp}. Valid for 10 minutes.`;
        break;
      case 'verify_mobile':
        message = `Your eFPS verification OTP is: ${otp}. Valid for 10 minutes.`;
        break;
      case '2fa':
        message = `Your eFPS 2FA OTP is: ${otp}. Valid for 10 minutes.`;
        break;
      default:
        message = `Your eFPS OTP is: ${otp}. Valid for 10 minutes.`;
    }

    await sendSms(mobile, message);
  },
  { connection: getRedis() as any }
);

worker.on('completed', (job) => {
  console.log(`SMS job ${job.id} completed for ${job.data.mobile}`);
});

worker.on('failed', (job, err) => {
  console.error(`SMS job ${job?.id} failed:`, err);
});

export { worker as smsOtpWorker };
