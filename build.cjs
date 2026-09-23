const fs=require('node:fs');
const esbuild=require('esbuild');
(async()=>{
  fs.mkdirSync('www',{recursive:true});
  let html=fs.readFileSync('web-source/index.html','utf8');
  html=html.replace(/<link[^>]+(?:fonts\.googleapis\.com|fonts\.gstatic\.com|rel="manifest")[^>]*>/g,'');
  html=html.replace('if ("serviceWorker" in navigator) {','if (false) {');
  html=html.replace('</body>','<script src="pdf-engine.js"></script><script src="native.js"></script><script src="native-glue.js"></script></body>');
  fs.writeFileSync('www/index.html',html);
  fs.cpSync('web-source/icons','www/icons',{recursive:true});
  fs.copyFileSync('native-glue.js','www/native-glue.js');
  fs.copyFileSync('web-source/enhancements.css','www/enhancements.css');
  fs.copyFileSync('web-source/enhancements.js','www/enhancements.js');
  fs.copyFileSync('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js','www/pdf.worker.min.js');
  await Promise.all([
    esbuild.build({entryPoints:['native.js'],bundle:true,format:'iife',outfile:'www/native.js'}),
    esbuild.build({entryPoints:['pdf-engine.js'],bundle:true,format:'iife',outfile:'www/pdf-engine.js'})
  ]);
})().catch(e=>{console.error(e);process.exitCode=1});
