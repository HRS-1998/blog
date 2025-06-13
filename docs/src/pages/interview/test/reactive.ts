

const deps = new WeakMap();
function track(){

}

function trigger(){

}

function effect(fn){

}

function reactive(target){
    return new Proxy(target,{
     get:function(target,key){

        return Reflect.get(target,key)

     },
     set(target,key,value){
        return target[key] = value   
     }
    })
    
}

const a  = reactive({name: 'a',age:11});
let b;
effect(()=>{
   b= a.age +1
})
console.log(b);
a.name =4
console.log(b)