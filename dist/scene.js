import * as THREE from './vendor/three.module.js';
const container=document.querySelector('#sculpture'),canvas=document.querySelector('#scene'),toggle=document.querySelector('#motion-toggle');
try {
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(0x0b0c0b,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,50);camera.position.set(0,.2,7.9);
scene.add(new THREE.HemisphereLight(0xffedce,0x182318,2.2));
function light(color,intensity,x,y,z){const l=new THREE.PointLight(color,intensity,30);l.position.set(x,y,z);scene.add(l);}light(0xffe5ba,65,-3,4,4);light(0xffffff,45,4,1,3);light(0x9b783e,32,-2,-3,-2);
const sculpture=new THREE.Group();scene.add(sculpture);
const path=new THREE.Shape();const points=[[-1.15,1.55],[-.49,1.55],[0,.62],[.49,1.55],[1.15,1.55],[.37,0],[1.15,-1.55],[.49,-1.55],[0,-.62],[-.49,-1.55],[-1.15,-1.55],[-.37,0]];
points.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath();
const geometry=new THREE.ExtrudeGeometry(path,{depth:.38,bevelEnabled:true,bevelThickness:.105,bevelSize:.085,bevelSegments:5,steps:1,curveSegments:12});geometry.center();
const gold=new THREE.MeshPhysicalMaterial({color:0xc8a66b,metalness:.8,roughness:.25,clearcoat:.55,clearcoatRoughness:.18});
const x=new THREE.Mesh(geometry,gold);sculpture.add(x);sculpture.rotation.set(.12,-.4,-.16);
const ringMaterial=new THREE.MeshBasicMaterial({color:0xb79b65,transparent:true,opacity:.22});
const ring=new THREE.Mesh(new THREE.TorusGeometry(2.15,.006,6,160),ringMaterial);ring.rotation.set(1.12,.38,-.25);sculpture.add(ring);
const satellite=new THREE.Mesh(new THREE.SphereGeometry(.055,12,12),new THREE.MeshStandardMaterial({color:0xead7b3,metalness:.7,roughness:.2}));satellite.position.set(2.15,0,0);ring.add(satellite);
const ring2=new THREE.Mesh(new THREE.TorusGeometry(2.42,.0035,4,160),new THREE.MeshBasicMaterial({color:0xb79b65,transparent:true,opacity:.11}));ring2.rotation.set(.4,-.8,.4);sculpture.add(ring2);
let paused=reduced.matches,visible=true,frame=0,targetX=0,targetY=0,rx=0,ry=0;toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Play sculpture animation':'Pause sculpture animation');toggle.textContent=paused?'▷':'Ⅱ';
function resize(){const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.render(scene,camera);}new ResizeObserver(resize).observe(container);
container.addEventListener('pointermove',e=>{if(reduced.matches)return;const b=container.getBoundingClientRect();targetX=(e.clientX-b.left)/b.width-.5;targetY=(e.clientY-b.top)/b.height-.5;});container.addEventListener('pointerleave',()=>{targetX=0;targetY=0;});
toggle.addEventListener('click',()=>{paused=!paused;toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Play sculpture animation':'Pause sculpture animation');toggle.textContent=paused?'▷':'Ⅱ';});
reduced.addEventListener('change',()=>{paused=reduced.matches;toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Play sculpture animation':'Pause sculpture animation');toggle.textContent=paused?'▷':'Ⅱ';});
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;},{rootMargin:'60px'}).observe(container);
function animate(){requestAnimationFrame(animate);if(!visible||document.hidden)return;if(!paused){frame+=.008;rx+=(targetY*.2-rx)*.035;ry+=(targetX*.55-ry)*.035;sculpture.rotation.y=-.4+Math.sin(frame*.35)*.28+ry;sculpture.rotation.x=.12+rx;sculpture.position.y=Math.sin(frame*.7)*.07;ring.rotation.z=frame*.12;}renderer.render(scene,camera);}resize();container.classList.add('ready');animate();
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();container.classList.remove('ready');toggle.hidden=true;});
} catch(error){toggle.hidden=true;container.querySelector('.scene-hint').textContent='THE EMPIREX SIGNATURE';}
