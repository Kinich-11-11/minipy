const fs=require('fs'), zlib=require('zlib');
const src=process.argv[2], dst=process.argv[3];
const inp=fs.createReadStream(src), out=fs.createWriteStream(dst), dec=zlib.createZstdDecompress();
let n=0; inp.pipe(dec); dec.on('data',c=>{n+=c.length; out.write(c);}); dec.on('end',()=>{out.end(); console.log('decompressed bytes',n);});
dec.on('error',e=>{console.error('ERR',e.message);process.exit(1);});
