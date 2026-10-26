// PlantSignal concept 02 (2026-10-26). Units: mm. No physical fit test performed.
// Select: "assembly", "sleeve", "electronics-base", "electronics-lid", "sensor-clip", "reservoir-cradle".
// Assembly shows printed parts only. Hardware dimensions are assumptions.
part = "assembly";
$fn = 96;
sleeve_od = 144;
sleeve_wall = 3;
sleeve_h = 130;
case_x = 100;
case_y = 68;
case_h = 35;
wall = 3;

module block(size, p) { translate(p) cube(size, center=true); }
module post(r,h,p) { translate(p) cylinder(r=r,h=h,center=true); }
module sleeve() {
    difference() {
        post(sleeve_od/2,sleeve_h,[0,0,sleeve_h/2]);
        post(sleeve_od/2-sleeve_wall,sleeve_h+2,[0,0,(sleeve_h+8)/2]);
        for(p=[[30,0],[-30,0],[0,30],[0,-30]]) post(3,6,[p[0],p[1],1.5]);
    }
}
module electronics_base() {
    difference() {
        union() {
            difference() {
                block([case_x,case_y,case_h],[0,0,case_h/2]);
                block([case_x-2*wall,case_y-2*wall,case_h+1],[0,0,(case_h+7)/2]);
            }
            for(x=[-44,44],y=[-28,28]) post(4,32,[x,y,19]);
        }
        for(x=[-44,44],y=[-28,28]) post(1.3,32,[x,y,21]);
        block([8,14,10],[case_x/2-1,0,13]);
        translate([-case_x/2+1,12,26]) rotate([0,90,0]) cylinder(r=3,h=10,center=true);
    }
}
module electronics_lid() {
    difference() {
        block([case_x,case_y,3],[0,0,1.5]);
        for(x=[-44,44],y=[-28,28]) post(1.7,6,[x,y,1.5]);
    }
}
module sensor_clip() {
    translate([0,0,-115]) difference() {
        union() {
            block([12,4,21],[0,-76,125.5]);
            block([12,4,21],[0,-66,125.5]);
            block([12,14,4],[0,-71,134]);
            block([12,20,4],[0,-58,134]);
            block([31,9,12],[0,-53.5,130]);
        }
        block([25,3.2,12],[0,-53.5,132]);
    }
}
// Dry support for a purchased refillable reservoir. This is not a water container.
module reservoir_cradle() {
    difference() {
        post(46,20,[0,0,10]);
        post(42,22,[0,0,14]);
    }
}
if(part=="sleeve") sleeve();
else if(part=="electronics-base") electronics_base();
else if(part=="electronics-lid") electronics_lid();
else if(part=="sensor-clip") sensor_clip();
else if(part=="reservoir-cradle") reservoir_cradle();
else {
    color("Wheat") sleeve();
    color("DarkSlateGray") translate([136,0,0]) electronics_base();
    color("SeaGreen") translate([136,0,35]) electronics_lid();
    color("Orange") translate([0,0,115]) sensor_clip();
    color("SeaGreen") translate([-132,0,0]) reservoir_cradle();
}
