import { AUPredictor } from "@quarkworks-inc/avatar-webkit"
import "./style.css"

// Hallway SDK
let videoStream = await navigator.mediaDevices.getUserMedia({
  audio: false,
  video: {
    width: { ideal: 640 },
    height: { ideal: 360 },
    facingMode: "user",
  },
})

console.log(`using auth token ${import.meta.env.VITE_AVATAR_WEBKIT_AUTH_TOKEN}`)

let predictor = new AUPredictor({
  apiToken: import.meta.env.VITE_AVATAR_WEBKIT_AUTH_TOKEN,
  srcVideoStream: videoStream,
})

predictor.onPredict = (results) => {
  console.log(results)
}

await predictor.start()
console.log("Predictor started...")
