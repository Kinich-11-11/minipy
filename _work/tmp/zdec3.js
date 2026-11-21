const fs=require('fs'), zlib=require('zlib');
const src=process.argv[2], dst=process.argv[3];
const buf=fs.readFileSync(src);
console.log('input bytes', buf.length);
console.log('first frame preview:', JSON.stringify(zlib.zstdDecompressSync(buf).toString('utf8').slice(0,180)));
const MAGIC=Buffer.from([0x28,0xB5,0x2F,0xFD]);
const pos=[]; let idx=buf.indexOf(MAGIC,0);
while(idx!==-1){ pos.push(idx); idx=buf.indexOf(MAGIC,idx+1); }
console.log('magic occurrences', pos.length, 'first', pos.slice(0,6), 'deltas', pos.slice(1,8).map((v,i)=>v-pos[i]));
const chunks=[];
let ok=0,bad=0,total=0;
for(let i=0;i<pos.length;i++){
  const end = i+1<pos.length ? pos[i+1] : buf.length;
  try { const d=zlib.zstdDecompressSync(buf.subarray(pos[i],end)); chunks.push(d); total+=d.length; ok++; }
  catch(e){ bad++; }
}
console.log('frames ok',ok,'bad',bad,'total bytes',total);
fs.writeFileSync(dst, Buffer.concat(chunks));
