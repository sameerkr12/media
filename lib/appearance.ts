export const themes = [
 {id:'empire',name:'Empire Gold',description:'Signature gold & forest',colors:['#0b0e09','#d5bc92']},
 {id:'midnight',name:'Midnight',description:'Electric blue after dark',colors:['#080f25','#80bfff']},
 {id:'pearl',name:'Pearl',description:'Warm, clean & editorial',colors:['#f6f2eb','#69513c']},
 {id:'sunset',name:'Sunset',description:'Rich plum & soft coral',colors:['#28122d','#ffb598']},
 {id:'mint',name:'Fresh Mint',description:'Light sage & deep green',colors:['#eaf4ec','#21583f']},
 {id:'mono',name:'Monochrome',description:'Sharp black & white',colors:['#101010','#ffffff']},
] as const;
export const layouts=[{id:'rounded',name:'Soft cards'},{id:'pill',name:'Pill buttons'},{id:'outline',name:'Minimal outline'}] as const;
export const fonts=[{id:'modern',name:'Modern'},{id:'editorial',name:'Editorial'},{id:'mono',name:'Studio mono'}] as const;
