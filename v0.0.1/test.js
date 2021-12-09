let obj1 = {key1: 'val1'}
let obj2 = {key1: 'val2'}
let obj3 = {key1: 'val3'}
let obj4 = {key1: 'val4'}
let obj5 = {key1: 'val5'}

let arr1 = [obj1, obj2, obj3, obj4, obj5];
let arr2 = [obj1, obj2, obj3, obj4, obj5];

// let arrAll = arr1.concat(arr2);

// [arr1,arr2] = [arr1,arr2].map(arr=>arr.filter(ob => ob.key1 !== 'val1'));
// arrAll = arrAll.map(arr=>arr.filter(ob => ob.key1 !== 'val1'));
// arrAll = arrAll.filter(ob => ob.key1 !== 'val1');

arr2.push(...arr1.splice(0));

// console.log(arr1);
// console.log(arr2);
// console.log(arrAll)

// console.log('fin');




const addNumber = (baseNum, addMe) => {
  base = 50;
  return +baseNum + +addMe;
}


var base = 20;
console.log(addNumber(1, 5));