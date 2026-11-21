const fs=require('fs'), zlib=require('zlib');
const src=process.argv[2], dst=process.argv[3];
const buf=fs.readFileSync(src);
console.log('input bytes', buf.length);
// try whole-buffer sync first
try { const o=zlib.zstdDecompressSync(buf); console.log('whole-buffer OK', o.length); fs.writeFileSync(dst,o); process.exit(0); }
catch(e){ console.log('whole-buffer failed:', e.message); }
// split on zstd magic 28 B5 2F FD
const MAGIC=Buffer.from([0x28,0xB5,0x2F,0xFD]);
const pos=[]; let idx=buf.indexOf(MAGIC,0);
while(idx!==-1){ pos.push(idx); idx=buf.indexOf(MAGIC,idx+1); }
console.log('magic occurrences', pos.length, 'first few', pos.slice(0,5));
const out=fs.createWriteStream(dst);
let ok=0, bad=0, total=0;
for(let i=0;i<pos.length;i++){
  const end = i+1<pos.length ? pos[i+1] : buf.length;
  const chunk = buf.subarray(pos[i], end);
  try { const d=zlib.zstdDecompressSync(chunk); out.write(d); total+=d.length; ok++; }
  catch(e){ bad++; }
}
out.end();
out.on('finish',()=>console.log('frames ok',ok,'bad',bad,'total bytes',total));
