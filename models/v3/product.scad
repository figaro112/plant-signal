// PlantSignal integrated design 03. mm. Fit and water operation are untested.
// The companion Python CAD script is the exact source used for the supplied exports.
part = "assembly";
$fn = 128;
body_width=230; body_depth=160; body_radius=80;

module rounded2d(w,d,r){
    hull() for(x=[-w/2+r,w/2-r],y=[-d/2+r,d/2-r]) translate([x,y]) circle(r=r);
}
module rounded(w,d,r,h,z=0){translate([0,0,z]) linear_extrude(height=h) rounded2d(w,d,r);}
module loft(w,d,r,profiles){
    for(i=[0:len(profiles)-2]) hull(){
        for(j=[i,i+1]) translate([0,0,profiles[j][0]]) linear_extrude(height=0.02)
            rounded2d(w-2*profiles[j][1],d-2*profiles[j][1],r-profiles[j][1]);
    }
}
module c(r,h,z=0,x=0,y=0){translate([x,y,z]) cylinder(r=r,h=h);}
module slot(w,h,r,depth,p){translate(p) rotate([90,0,0]) rounded(w,h,r,depth);}
module block(s,p){translate(p) cube(s,center=true);}

module main_shell(){difference(){
    union(){
        difference(){
            loft(body_width,body_depth,body_radius,[[12,4],[14,1],[16,0],[153,0],[155,1],[157,3]]);
            rounded(222,152,76,146,16);
        }
        loft(230,160,80,[[151,0],[153,0],[155,1],[157,3]]);
        c(70,112,45,-31);
        for(x=[-45,45],y=[-50,50])c(4.5,16,14,x,y);
    }
    c(67,120,49,-31);
    translate([76,0,0])rounded(42,96,21,18,147);
    for(x=[-45,45],y=[-50,50])c(1.35,16,10,x,y);
    slot(9,64,4.5,30,[62,-55,82]);
    slot(54,26,5,12,[0,85,34]);
}}
module base_plinth(){difference(){
    loft(222,152,76,[[0,4],[2,1],[4,0],[10,0],[12,1]]);
    for(x=[-45,45],y=[-50,50])c(1.7,18,-3,x,y);
}}
module refill_lid(){difference(){
    translate([76,0,156])loft(48,106,24,[[0,2],[1,0],[4,0],[6,1]]);
    c(7,5,160,76,-51);
}}
module rear_service_cover(){slot(58,30,7,3,[0,82,34]);}
module sensor_holder(){translate([-65,58,137])rotate([0,0,30])difference(){
    union(){block([24,3,20],[0,-4.5,10]);block([24,3,20],[0,4.5,10]);block([24,12,3],[0,0,20.5]);}
    block([19,2,12],[0,4.5,17]);
}}
if(part=="main-shell")main_shell();
else if(part=="base-plinth")base_plinth();
else if(part=="refill-lid")refill_lid();
else if(part=="rear-service-cover")rear_service_cover();
else if(part=="sensor-holder")sensor_holder();
else{
    color("Ivory")main_shell();
    color("DarkSlateGray")base_plinth();
    color("DarkSeaGreen")refill_lid();
    color("Ivory")rear_service_cover();
    color("DarkOliveGreen")sensor_holder();
}
