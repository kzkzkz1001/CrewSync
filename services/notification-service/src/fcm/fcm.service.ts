import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  }

  async sendPush(fcmToken: string, title: string, body: string): Promise<void> {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      android: { priority: 'high' },
      apns: { payload: { aps: { contentAvailable: true } } },
    });
  }
}
