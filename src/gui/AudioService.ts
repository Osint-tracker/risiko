/** Local audio, unlocked synchronously by a user gesture; preferences survive restarts. */
export class GameAudio {
 muted=false;
 haptics=false;
 volume=.65;
 private context:AudioContext|null=null;
 private buffer:AudioBuffer|null=null;
 private loading:Promise<void>|null=null;
 private tones=new Set<OscillatorNode>();
 private voices=new Set<AudioBufferSourceNode>();
 constructor(){try{const saved=JSON.parse(localStorage.getItem('risiko-audio')??'{}');this.muted=saved.muted===true;this.haptics=saved.haptics===true;this.volume=typeof saved.volume==='number'?Math.max(0,Math.min(1,saved.volume)):.65;}catch{}}
 save(){try{localStorage.setItem('risiko-audio',JSON.stringify({muted:this.muted,volume:this.volume,haptics:this.haptics}));}catch{}}
 async unlock(){
  try{
   this.context??=new AudioContext();
   if(this.context.state==='suspended')await this.context.resume();
   const context=this.context;
   this.loading??=fetch('/audio/clash.wav').then(r=>{if(!r.ok)throw Error('Audio locale non disponibile');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).then(b=>{this.buffer=b;}).catch(()=>{this.loading=null;});
   await this.loading;
  }catch{}
 }
 get ready(){return this.context?.state==='running'&&!!this.buffer;}
 clash(){
  if(this.muted||!this.context||this.context.state!=='running'||!this.buffer)return;
  // Rapid sequences do not accumulate voices.
  this.stop();
  const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.buffer;
  gain.gain.value=this.volume;source.connect(gain);gain.connect(this.context.destination);
  this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};source.start();
 }
 tap(){
  if(this.muted||!this.context||this.context.state!=='running')return;
  const o=this.context.createOscillator(),g=this.context.createGain(),now=this.context.currentTime;
  o.frequency.setValueAtTime(400,now);o.frequency.exponentialRampToValueAtTime(180,now+.06);
  g.gain.setValueAtTime(.07*this.volume,now);g.gain.exponentialRampToValueAtTime(.001,now+.07);
  o.connect(g);g.connect(this.context.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start();o.stop(now+.08);
 }
 private noise(at:number,length:number,frequency:number,level:number){
  const c=this.context;if(this.muted||!c||c.state!=='running'||typeof c.createBuffer!=='function')return;
  const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*length),c.sampleRate),samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.pow(1-i/samples.length,2);
  const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;gain.gain.value=level*this.volume;
  source.connect(filter);filter.connect(gain);gain.connect(c.destination);this.voices.add(source);
  source.onended=()=>{this.voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start(c.currentTime+at);
 }
 private pulse(frequency:number,at:number,length:number,level=.12,wave:OscillatorType='triangle'){
  if(this.muted||!this.context||this.context.state!=='running')return;
  const context=this.context,o=context.createOscillator(),g=context.createGain(),start=context.currentTime+at;
  o.type=wave;o.frequency.setValueAtTime(frequency,start);o.frequency.exponentialRampToValueAtTime(Math.max(35,frequency*.55),start+length);
  g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.0001,level*this.volume),start+.005);g.gain.exponentialRampToValueAtTime(.0001,start+length);
  o.connect(g);g.connect(context.destination);this.tones.add(o);o.onended=()=>{this.tones.delete(o);o.disconnect();g.disconnect();};o.start(start);o.stop(start+length+.01);
 }
 vibrate(pattern:number|number[]){if(this.haptics)try{globalThis.navigator?.vibrate?.(pattern);}catch{}}
 playDeploy(){this.pulse(700,0,.055,.08);this.pulse(190,.025,.08,.06);}
 playDiceRoll(){for(let i=0;i<7;i++){this.pulse(260+i%3*130,i*.045,.035,.11);this.noise(i*.045,.04,900,.11);}this.vibrate([12,28,12]);}
 playConquest(){[392,494,587].forEach((f,i)=>this.pulse(f,i*.055,.28,.08,'sine'));this.vibrate([35,45,60]);}
 playCardDraw(){this.noise(0,.22,2600,.23);for(let i=0;i<6;i++)this.pulse(1400+i*170,i*.025,.035,.025,'sawtooth');}
 playCardTrade(){[330,440,554,660].forEach((f,i)=>this.pulse(f,i*.065,.2,.065,'sine'));}
 playTurnStart(){this.pulse(660,0,.13,.1,'sine');this.pulse(880,.18,.22,.1,'sine');}
 stop(){for(const tone of this.tones){try{tone.stop();}catch{}}this.tones.clear();for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
 dispose(){this.stop();void this.context?.close();}
}
