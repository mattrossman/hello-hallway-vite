import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import Stats from "three/examples/jsm/libs/stats.module.js"
import { AUPredictor } from "@quarkworks-inc/avatar-webkit"

import "./style.css"

const RPM_AVATAR_URL = "https://d1a370nemizbjq.cloudfront.net/b2572c50-a10a-42b6-ab30-694f60fed40f.glb"

// Scene, Camera
const scene = new THREE.Scene()
scene.background = new THREE.Color("#DDDDDD")
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 0, 3)

// WebGL renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.outputEncoding = THREE.sRGBEncoding
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
renderer.domElement.style.transform = "scaleX(-1)" // Mirror image

// Model
const root = new THREE.Group()
const loader = new GLTFLoader()
const gltf = await loader.loadAsync(RPM_AVATAR_URL)
gltf.scene.position.y = -0.6
root.scale.setScalar(7)

root.add(gltf.scene)
scene.add(root)

const meshes = []
gltf.scene.traverse((o) => {
  if (o.isMesh && o.morphTargetDictionary) {
    meshes.push(o)
  }
})

/** @type {Record<string, THREE.Bone>} */
const bones = {
  leftEye: gltf.scene.getObjectByName("LeftEye"),
  rightEye: gltf.scene.getObjectByName("RightEye"),
  head: gltf.scene.getObjectByName("Head"),
}

// Lighting
scene.add(new THREE.AmbientLight())
scene.add(new THREE.DirectionalLight())

// Stats
const stats = new Stats()
document.body.appendChild(stats.dom)

function render() {
  stats.update()
  renderer.render(scene, camera)
}
renderer.setAnimationLoop(render)

// Window sizing
window.addEventListener("resize", onWindowResize, false)
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
}

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

/**
 * @typedef {import('@quarkworks-inc/avatar-webkit').AvatarPrediction} AvatarPrediction
 * @type {(results: AvatarPrediction) => void}
 */
predictor.onPredict = (results) => {
  const { actionUnits, rotation } = results
  for (let i = 0; i < meshes.length; ++i) {
    for (let key in actionUnits) {
      meshes[i].morphTargetInfluences[meshes[i].morphTargetDictionary[key]] = actionUnits[key]
    }
  }

  bones.leftEye.rotation.set(
    -Math.PI / 2 + actionUnits["eyeLookDownRight"] * 0.5 - actionUnits["eyeLookUpRight"] * 0.5,
    0,
    Math.PI - actionUnits["eyeLookOutRight"] + actionUnits["eyeLookOutLeft"]
  )
  bones.rightEye.rotation.copy(bones.leftEye.rotation)

  bones.head.rotation.set(-rotation.pitch, rotation.yaw, -rotation.roll)
}

await predictor.start()
console.log("Predictor started...")
