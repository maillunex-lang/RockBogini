// OTP 27 exsss: 58-bit xorshift star-star, splitmix64 tuple initialization.
const mask=(1n<<58n)-1n,m64=(1n<<64n)-1n;
function seed58(x:bigint):[bigint,bigint]{
 for(;;){x=(x+11400714819323198485n)&m64;let z=((x^(x>>30n))*13787848793156543929n)&m64;z=((z^(z>>27n))*10723151780598845931n)&m64;z=(z^(z>>31n))&mask;if(z)return [z,x]}
}
export function battleRandom(seed:number){
 if(!Number.isSafeInteger(seed))throw Error('invalid_seed');
 const [,x]=seed58(BigInt(seed));const [a,y]=seed58(0x5EEDn^x);const [b]=seed58(0xBA77n^y);let s1=a,s0=b;
 return ()=>{const t=(s1^(s1<<24n))&mask;const n=t^s0^(t>>11n)^(s0>>41n);const v=s0*5n;const r=((v<<7n)&mask)|((v>>51n)&127n);s1=s0;s0=n;return Number(((r*9n)&mask)>>5n)/9007199254740992};
}
