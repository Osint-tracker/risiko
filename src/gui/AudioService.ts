/** Local audio, unlocked synchronously by a user gesture; preferences survive restarts. */
export class GameAudio {
 muted=false;
 volume=.65;
 private context:AudioContext|null=null;
 private buffer:AudioBuffer|null=null;
 private loading:Promise<void>|null=null;
 private voices=new Set<AudioBufferSourceNode>();
 constructor(){try{const saved=JSON.parse(localStorage.getItem('risiko-audio')??'{}');this.muted=saved.muted===true;this.volume=typeof saved.volume==='number'?Math.max(0,Math.min(1,saved.volume)):.65;}catch{}}
 save(){try{localStorage.setItem('risiko-audio',JSON.stringify({muted:this.muted,volume:this.volume}));}catch{}}
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
 stop(){for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
 dispose(){this.stop();void this.context?.close();}
}
