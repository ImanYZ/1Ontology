import { doc, getDoc, setDoc } from "firebase/firestore";
import { getToken, MessagePayload, onMessage,  } from "firebase/messaging";

import { db, messaging } from "./firestoreClient.config";

const VAPID_KEY = "BJKsej0F-Cn_4424y04JVZtYOhtalhPLy1ysuBRGD_xHcgojUkJHL_HrfhagXqwnRLn_FUYm7_lQP3PZWZH5u4g";

// Requests permissions to show notifications.
async function requestNotificationsPermissions(uid: string) {
  console.log("Requesting notifications permission...");
  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    console.log("Notification permission granted.");
    // Notification permission granted.
    await saveMessagingDeviceToken(uid);
  } else {
    console.log("Unable to get permission to notify.");
  }
}

// Saves the messaging device token to Cloud Firestore.
export async function saveMessagingDeviceToken(uid: string) {
  try {
    //if (process.env.NODE_ENV === "development") return;
    const msg: any = await messaging();
    const fcmToken = await getToken(msg, { vapidKey: VAPID_KEY });
    if (fcmToken) {
      // Save device token to Firestore
      const tokenRef = doc(db, "fcmTokens", uid);
      const tokenDoc = await getDoc(tokenRef);
      if (tokenDoc.exists()) {
        const tokens = tokenDoc.data()?.tokens || [];
        if (tokens && !tokens.includes(fcmToken)) {
          tokens.push(fcmToken);
          await setDoc(tokenRef, { tokens: tokens });
        }
      } else {
        await setDoc(tokenRef, { tokens: [fcmToken] });
      }

      // This will fire when a message is received while the app is in the foreground.
      // When the app is in the background, firebase-messaging-sw.js will receive the message instead.
      onMessage(msg, (message: MessagePayload) => {
        if (Notification.permission === "granted") {
          new Notification(message?.notification?.title || "", {
            body: message.notification?.body,
          });
        }
      });
    } else {
      // Need to request permissions to show notifications.
      requestNotificationsPermissions(uid);
    }
  } catch (error) {
    console.error("Unable to get messaging token.", error);
  }
}
