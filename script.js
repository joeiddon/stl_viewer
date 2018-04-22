'use strict';

let cont = document.getElementById('cont');
let inpt = document.getElementById('inpt');
let disp = document.getElementById('disp');
let cnvs = document.getElementById('cnvs');
let settings = document.getElementById('settings');
let dst = document.getElementById('dst');

let world = [];
let wireframe = true;
let cam = {x: 0, y: -40, z: 0, yaw: 0, pitch: 0, roll: 0, fov: 60};
let mm_damp = 128;
let ms_damp = 20;
let set_w = 400;

let inputs = document.getElementsByTagName('input');
for (var i = 0; i < inputs.length; i++){
    if (inputs[i].type == 'range'){
        inputs[i].style.width = set_w / 2;
    }
}

inpt.addEventListener('change', function (e){
    let r = new FileReader();
    r.onload = function(){
        parse_stl(this.result);
        center_world();
        disp.style.display = 'block';
        cont.style.display = 'none';
        resize();
        update();
        window.addEventListener('resize', resize);
        cnvs.addEventListener('mousedown', md);
        cnvs.addEventListener('mousewheel', ms);
    }
    r.readAsArrayBuffer(e.target.files[0]);
});

function parse_stl(f){
    let b_arr = new Uint8Array(f);
    let s = '';
    for (let i = 0; i < 5; i++){
        s += String.fromCharCode(b_arr[i]);
    }
    if (s == 'solid'){
        parse_ascii(f);
    } else {
        parse_bin(f);
    }
}

function update(){
    zengine.render(world, cam, cnvs, wireframe);
}

function center_world(){
    let center = {x: 0, y: 0, z: 0}
    for (let f = 0; f < world.length; f++){
        let c = zengine.centroid(world[f].verts);
        center.x += c.x;
        center.y += c.y;
        center.z += c.z;
    }
    center.x /= world.length;
    center.y /= world.length;
    center.z /= world.length;
    world = world.map(f=>({verts: f.verts.map(zengine.translate(-center.x, -center.y, -center.z)),
                           col: f.col}));
}

function parse_ascii(f){
    world = [];
    let b_arr = new Uint8Array(f);
    let ascii = '';
    for (let i = 0; i < b_arr.length; i++){
        ascii += String.fromCharCode(b_arr[i]);
    }
    let re = /-?[0-9]+\.?[0-9]*(e-?[0-9]+\.?[0-9]*)?/g;
    let nums = ascii.match(re);
    for (let f = 0; f < nums.length; f += 12){
        let verts = [];
        for (let v = 3; v < 12; v +=3){
            verts.push({x: parseFloat(nums[f+v]),
                        y: parseFloat(nums[f+v+1]),
                        z: parseFloat(nums[f+v+2])});
        }
        world.push({verts: verts, col: '#fff'});
    }
}

function parse_bin(f){
    let dv = new DataView(f);
    //assuming binary .stl file, add in ASCII support later
    let pointer = 80;
    let no_faces = dv.getUint32(pointer, true);
    pointer += 4;
    world = [];
    for (let f = 0; f < no_faces; f++){
        let verts = [];
        pointer += 12;
        for (let v = 0; v < 3; v++){
            verts.push({x: dv.getFloat32(pointer,   true),
                        y: dv.getFloat32(pointer+4, true),
                        z: dv.getFloat32(pointer+8, true)});
            pointer += 12;
        }
        world.push({verts: verts, col: '#fff'});
        let atbc = dv.getUint16(pointer, true);
        if (atbc != 0) throw Error('attribute byte count not 0');
        pointer += 2;
    }
}

/*  mouse events  */
function md(e){
    cnvs.style.cursor = '-webkit-grabbing';
    cnvs.addEventListener('mouseup',   mu);
    cnvs.addEventListener('mousemove', mm);
    cnvs.removeEventListener('mousedown', md);
}

function mu(){
    cnvs.style.cursor = '-webkit-grab';
    cnvs.removeEventListener('mousemove', mm);
    cnvs.addEventListener('mousedown', md);
    cnvs.removeEventListener('mouseup', mu);
}

function mm(e){
    var dx = e.movementX / mm_damp;
    var dy = e.movementY / mm_damp;
    world = world.map(f=>({verts: f.verts.map(zengine.z_axis_rotate(dx))
                                         .map(zengine.x_axis_rotate(dy * -1)),
                           col: f.col}));
    update();
}

function ms(e){
    cam.y += e.deltaY / ms_damp;
    dst.value = -cam.y;
    update();
}

function resize(){
    cnvs.width = innerWidth - set_w;
    cnvs.height = innerHeight;
    update();
}
