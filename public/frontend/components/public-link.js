export function isExternalLink(value){
  if(!/^https?:\/\//i.test(value)||/[\s\x00-\x1f\x7f\\]/.test(value))return false;
  try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!!url.hostname&&!url.username&&!url.password;}catch{return false;}
}
export function isPublicLink(value){
  return isExternalLink(value)||/^#(?:inicio|capacitaciones|eventos|(?:curso|eventos)\/[1-9][0-9]*)$/.test(value);
}
