const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword, connectAuthEmulator } = require("firebase/auth");
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require("firebase/functions");

const app = initializeApp({
  apiKey: "fake-api-key",
  projectId: "mlbb-image",
  appId: "1:123:web:abc",
  messagingSenderId: "123",
});
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
const fns = getFunctions(app, "asia-south1");
connectFunctionsEmulator(fns, "127.0.0.1", 5001);

(async () => {
  const cred = await signInWithEmailAndPassword(auth, "mlbbaiimage@gmail.com", "mlbb03brimage");
  console.log("signed in:", cred.user.uid);
  const getAppIcon = httpsCallable(fns, "getAppIcon");
  const res = await getAppIcon({});
  console.log("getAppIcon result:", JSON.stringify(res.data));

  const png1x1 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const uploadIcon = httpsCallable(fns, "uploadIcon");
  const res2 = await uploadIcon({ fileName: "test-icon.png", contentType: "image/png", data: png1x1 });
  console.log("uploadIcon result:", JSON.stringify(res2.data));

  const res3 = await getAppIcon({});
  console.log("getAppIcon after upload:", JSON.stringify(res3.data));
  process.exit(0);
})().catch((e) => {
  console.error("ERR", e.code || "", e.message);
  process.exit(1);
});
