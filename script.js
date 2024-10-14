const musicBg = document.querySelector('audio');

// Simplex Noise implementation
class SimplexNoise {
  constructor() {
    this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
    this.p = [];
    for (let i=0; i<256; i++) {
      this.p[i] = Math.floor(Math.random()*256);
    }
    
    this.perm = new Array(512);
    this.permMod12 = new Array(512);
    for (let i=0; i<512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }
  
  noise3D(xin, yin, zin) {
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;
    let n0, n1, n2, n3;
    
    let s = (xin + yin + zin) * F3;
    let i = Math.floor(xin + s);
    let j = Math.floor(yin + s);
    let k = Math.floor(zin + s);
    
    let t = (i + j + k) * G3;
    let X0 = i - t;
    let Y0 = j - t;
    let Z0 = k - t;
    
    let x0 = xin - X0;
    let y0 = yin - Y0;
    let z0 = zin - Z0;
    
    let i1, j1, k1;
    let i2, j2, k2;
    
    if (x0 >= y0) {
      if (y0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
      else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
      else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
    } else {
      if (y0 < z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
      else if (x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
      else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
    }
    
    let x1 = x0 - i1 + G3;
    let y1 = y0 - j1 + G3;
    let z1 = z0 - k1 + G3;
    let x2 = x0 - i2 + 2.0 * G3;
    let y2 = y0 - j2 + 2.0 * G3;
    let z2 = z0 - k2 + 2.0 * G3;
    let x3 = x0 - 1.0 + 3.0 * G3;
    let y3 = y0 - 1.0 + 3.0 * G3;
    let z3 = z0 - 1.0 + 3.0 * G3;
    
    let ii = i & 255;
    let jj = j & 255;
    let kk = k & 255;
    
    let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if (t0 < 0) n0 = 0.0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[this.permMod12[ii+this.perm[jj+this.perm[kk]]]], x0, y0, z0);
    }
    
    let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    if (t1 < 0) n1 = 0.0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[this.permMod12[ii+i1+this.perm[jj+j1+this.perm[kk+k1]]]], x1, y1, z1);
    }
    
    let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    if (t2 < 0) n2 = 0.0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[this.permMod12[ii+i2+this.perm[jj+j2+this.perm[kk+k2]]]], x2, y2, z2);
    }
    
    let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    if (t3 < 0) n3 = 0.0;
    else {
      t3 *= t3;
      n3 = t3 * t3 * this.dot(this.grad3[this.permMod12[ii+1+this.perm[jj+1+this.perm[kk+1]]]], x3, y3, z3);
    }
    
    return 32.0 * (n0 + n1 + n2 + n3);
  }
  
  dot(g, x, y, z) {
    return g[0]*x + g[1]*y + g[2]*z;
  }
}

let scene, camera, renderer, waterDrop,directionalLight;
const originalColor = new THREE.Color(0x6495ED); // Cornflower blue
const textBubble = document.getElementById('textBubble');
const videoBackground = document.getElementById('videoBackground');
let isCameraActive = false;
let noiseScale = 0.1;
let noiseSpeed = 0.002;

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x87CEEB, 0); // Transparent background
  document.getElementById('scene').appendChild(renderer.domElement);

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 15, 10);
  scene.add(directionalLight);

  camera.position.z = 3;

  createWaterDropAvatar();

  handleResize();
  window.addEventListener('resize', handleResize);
  animate();
}

function createWaterDropAvatar() {
  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const material = new THREE.MeshPhysicalMaterial({
    color: originalColor,
    transparent: true,
    opacity: 1, // Increased opacity
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.5, // Reduced transmission
    clearcoat: 1,
    clearcoatRoughness: 0
  });
  waterDrop = new THREE.Mesh(geometry, material);
  waterDrop.scale.set(0.5, 0.5, 0.5); // Set initial scale to half
  scene.add(waterDrop);

  // Start vibration animation
  vibrate();

  document.getElementById('loading').style.display = 'none';
}

function animate() {
  requestAnimationFrame(animate);
  
  // Update vertex positions for vibration effect
  const time = Date.now() * noiseSpeed;
  const positions = waterDrop.geometry.attributes.position;
  
  for (let i = 0; i < positions.count; i++) {
    const vertex = new THREE.Vector3();
    vertex.fromBufferAttribute(positions, i);
    
    const noise = simplex.noise3D(
      vertex.x * noiseScale + time,
      vertex.y * noiseScale + time,
      vertex.z * noiseScale + time
    );
    
    vertex.addScaledVector(vertex.normalize(), noise * 0.1);
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  
  positions.needsUpdate = true;
  waterDrop.geometry.computeVertexNormals();
  
  renderer.render(scene, camera);
}

function vibrate() {
  gsap.to(waterDrop.position, {
    y: '+=0.05',
    duration: 0.5,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut"
  });
}

function playAnimation(type) {
  if (!waterDrop) return;

  // Reset color and scale
  gsap.to(waterDrop.material.color, { r: originalColor.r, g: originalColor.g, b: originalColor.b, duration: 0.5 });
  gsap.to(waterDrop.scale, { duration: 0.5, x: 0.5, y: 0.5, z: 0.5 }); // Reset to new base scale

  // Add animation and color change
  switch(type) {
    case 'happy':
      gsap.to(waterDrop.scale, { 
        duration: 0.5, 
        x: 0.6, // 20% larger than new base scale
        y: 0.6, 
        z: 0.6, 
        yoyo: true, 
        repeat: 3,
        onComplete: resetEffects
      });
      gsap.to(waterDrop.material.color, { r: 0, g: 1, b: 0, duration: 0.5 }); // Green
      noiseScale = 0.2;
      noiseSpeed = 0.004;
      break;
    case 'sad':
      gsap.to(waterDrop.scale, { 
        duration: 1, 
        y: 0.4, // 20% smaller than new base scale
        yoyo: true, 
        repeat: 1,
        onComplete: resetEffects
      });
      gsap.to(waterDrop.material.color, { r: 0, g: 0, b: 1, duration: 0.5 }); // Blue
      noiseScale = 0.05;
      noiseSpeed = 0.001;
      break;
    case 'excited':
      gsap.to(waterDrop.scale, { 
        duration: 0.3, 
        x: 0.65, // 30% larger than new base scale
        y: 0.65, 
        z: 0.65, 
        yoyo: true, 
        repeat: 5,
        onComplete: resetEffects
      });
      gsap.to(waterDrop.material.color, { r: 1, g: 0.5, b: 0, duration: 0.5 }); // Orange
      noiseScale = 0.3;
      noiseSpeed = 0.006;
      break;
  }
}

function resetEffects() {
  gsap.to(waterDrop.material.color, { 
    r: originalColor.r, 
    g: originalColor.g, 
    b: originalColor.b, 
    duration: 0.5 
  });
  gsap.to(waterDrop.scale, { duration: 0.5, x: 0.5, y: 0.5, z: 0.5 }); // Reset to new base scale
  noiseScale = 0.1;
  noiseSpeed = 0.002;
}
const textBubbleWrapper = document.querySelector('.text-bubble-wrapper');

let randomDegs = ['-7deg','-5deg','-2deg','7deg','5deg','2deg']
function showTextBubble(text, time) {
  let bubbleDiv = document.createElement('div');
  bubbleDiv.classList.add('text-bubble');
  bubbleDiv.style.transform = `rotate(${randomDegs[Math.floor(Math.random() * ((randomDegs.length - 1) + 1))]})`
  bubbleDiv.textContent = text;
  textBubbleWrapper.appendChild(bubbleDiv);

  setTimeout(()=> {
    bubbleDiv.classList.add('hidden');
    setTimeout(()=> {bubbleDiv.remove()},1000)
  },time - 100)
}

// API function to show text bubble
function showBubbleText(text) {
  showTextBubble(text);
}



function handleResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

const simplex = new SimplexNoise();
let lightON = false;
init();

// Expose the API function globally
window.showBubbleText = showBubbleText;

const screenPlay = document.querySelector('.screen-play');

function hideScreenPlay() {
    screenPlay.classList.add('hidden')
}
function playGame() {
  musicBg.volume = 0.1;
  musicBg.play();
    hideScreenPlay();
    setTimeout(()=> { 
      showTextBubble('ХЭЙ!',2000);
      playSound('hey');
      setTimeout(()=>{
        playSound('vi_kto');
        showTextBubble('Вы кто такие, я вас не звал, идите...',2000);
        setTimeout(()=>{
          showTextBubble('Ааа, это ты',2000);
          setTimeout(()=>{
            playSound('svet');
            showTextBubble('Включи-ка свет',3000);
            btnLight.classList.remove('hidden')
            setTimeout(()=>{
              if(!lightON) {
                playSound('von_knopka');
                showTextBubble('Вон на верху кнопка, давай-давай',3000);
              }
              
              
            }, 5000)
          }, 2000)
        }, 2000)
      }, 2000)
    },1500)
   
    
    
}
function playScene2() {
  
  showTextBubble('Оо, так лучше, даа',3000);
  playSound('luchshe');
  playAnimation('happy')
  setTimeout(() => {
    playSound('taks');
    showTextBubble('Так-с, меня не представили',3000);
    setTimeout(() => {
      playSound('trevozh_tru');
      showTextBubble('Я твоя ТРЕВОЖНОСТЬ',3000);
      setTimeout(()=>playAnimation('excited'),500);
      setTimeout(() => {
        playSound('uznala');
        showTextBubble('И я тут узнала, что тебе кажется...',3000);
        setTimeout(() => {
          
          showTextBubble('Что твой муж НЕ ЛЮБИТ тебя...',3000);
          setTimeout(()=>playAnimation('sad'),1500);
          setTimeout(() => {
            playSound('zaya');
            showTextBubble('Но! Зая, я знаю, как помочь тебе и узнать точно..',5000);
            setTimeout(() => {
              playSound('ne_budem');
              showTextBubble('Мы, конечно, не будем его ПРОСТО спрашивать,пффф',5000);
              setTimeout(()=>playAnimation('excited'),2000);
              setTimeout(() => {
                playSound('testik');
                showTextBubble('Я тут тестик один нашла, давай попробуем',5000);
                setTimeout(()=>playAnimation('happy'),1000);
                btnQuize.classList.remove('hidden')
              }, 5000);
            }, 5000);
          }, 4000);
        }, 3000);
      }, 3000);
    }, 3000);
  }, 4000);
}
window.Telegram.WebApp.disableVerticalSwipes();
const btnQuize = document.querySelector('.btn-play');

const light = document.querySelector('.light')
const btnLight = document.querySelector('.btn-light')
function setLight() {
  lightON = true;
  light.classList.add('fade');
  btnLight.classList.add('hidden');
  document.querySelectorAll('.text-bubble').forEach((bub)=>{
    bub.classList.add('hidden');
  });
  setTimeout(playScene2,1000);
}
const screenGame = document.querySelector('.game-wrapper');
function playQuize() {
  document.querySelectorAll('.text-bubble').forEach((bub)=>{
    bub.classList.add('hidden');
  });
  screenGame.classList.remove('hidden');
  btnQuize.classList.add('hidden');
  showTextBubble('Так, первый вопрос..',3000);
  playSound('tak_perv');
  setTimeout(()=> {
    playSound('vopros');
    showTextBubble('Он сегодня говорил, что тебя любит?',3000);
  }, 3000)
}

function playSound(title) {
  audioObj = new Audio(`./sounds/${title}.MP3`);
  audioObj.play();
}

const loaderLine = document.querySelector('.loader-line')
function setProgress(progress) {
  loaderLine.style.width = progress + `%`
};

document.addEventListener("DOMContentLoaded", () => {
  let countProgress = 20;
  const loaderBar = document.querySelector('.loader-bar');
  const loaderScreen = document.querySelector('.screen-loader')
  let progressLoader = setInterval(()=> {
    if(countProgress < 100){
      setProgress(countProgress);
      countProgress += 5;
    } else {
      setProgress(100);
      document.querySelector('.loader-text').textContent = 'ГОТОООВ!'
      clearInterval(progressLoader);
      setTimeout(() => {
        loaderBar.classList.add('hidden');
        loaderScreen.classList.add('hidden');
      }, 1000);
    }
    
  },300) 
});

