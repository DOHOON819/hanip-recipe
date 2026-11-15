const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
(async()=>{
  const root=path.resolve(__dirname,'..');
  const extra=await import('../i18n-extra.js'),social=await import('../i18n-social.js'),feedback=await import('../i18n-feedback.js');
  const source=fs.readFileSync(path.join(root,'i18n.js'),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'').replace(/^applyTranslations\(\);$/gm,'');
  const dictionaries=vm.runInNewContext(source+';dictionaries',{...extra,...social,...feedback,localStorage:{getItem:()=>null}});
  const keys=Object.keys(dictionaries.ko);
  for(const language of ['ja','fr','it','hi','es-MX','zh-CN','ar']) {
    const missing=keys.filter(k=>!dictionaries[language][k]);
    console.log(language,missing.length,JSON.stringify(missing));
    if(missing.length) process.exitCode=1;
  }
})();
