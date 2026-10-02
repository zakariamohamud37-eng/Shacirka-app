const fs=require('node:fs');
const esbuild=require('esbuild');
(async()=>{
  fs.mkdirSync('www',{recursive:true});
  const webBuild=process.env.NETLIFY==='true'||process.env.HAGE_WEB_BUILD==='true';
  let html=fs.readFileSync('web-source/index.html','utf8');
  if(!webBuild){
    html=html.replace(/<link[^>]+(?:fonts\.googleapis\.com|fonts\.gstatic\.com|rel="manifest")[^>]*>/g,'');
    html=html.replace('if ("serviceWorker" in navigator) {','if (false) {');
    html=html.replace('</body>','<script src="pdf-engine.js"></script><script src="native.js"></script><script src="native-glue.js"></script></body>');
  }else html=html.replace('</body>','<script src="pdf-engine.js"></script></body>');
  fs.writeFileSync('www/index.html',html);
  fs.cpSync('web-source/icons','www/icons',{recursive:true});
  if(!webBuild)fs.copyFileSync('native-glue.js','www/native-glue.js');
  for(const file of ['manifest.json','service-worker.js','download.html','version.json'])fs.copyFileSync(file,`www/${file}`);
  if(fs.existsSync('downloads/HageStudy.apk'))fs.copyFileSync('downloads/HageStudy.apk','www/HageStudy.apk');
  fs.copyFileSync('web-source/enhancements.css','www/enhancements.css');
  fs.copyFileSync('web-source/enhancements.js','www/enhancements.js');
  fs.copyFileSync('web-source/ai-chat.css','www/ai-chat.css');
  fs.copyFileSync('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js','www/pdf.worker.min.js');
  const builds=[
    esbuild.build({entryPoints:['pdf-engine.js'],bundle:true,format:'iife',outfile:'www/pdf-engine.js'}),
    esbuild.build({entryPoints:['auth-client.js'],bundle:true,minify:true,format:'iife',outfile:'www/auth-client.bundle.js'}),
    esbuild.build({entryPoints:['data-sync.js'],bundle:true,minify:true,format:'iife',outfile:'www/data-sync.bundle.js'}),
    esbuild.build({entryPoints:['ai-chat.js'],bundle:true,minify:true,format:'iife',outfile:'www/ai-chat.bundle.js'})
  ];if(!webBuild)builds.push(esbuild.build({entryPoints:['native.js'],bundle:true,format:'iife',outfile:'www/native.js'}));await Promise.all(builds);
})().catch(e=>{console.error(e);process.exitCode=1});
