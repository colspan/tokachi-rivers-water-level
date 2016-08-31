
var positions_raw = [
    ["42度34分48秒", "142度56分05秒"],
    ["42度34分48秒", "142度56分05秒"],
    ["42度34分48秒", "142度56分05秒"],
    ["42度36分12秒", "142度59分13秒"],
    ["42度38分32秒", "143度05分30秒"],
    ["42度47分52秒", "143度09分24秒"],
    ["42度47分52秒", "143度09分24秒"],
    ["42度50分23秒", "143度11分17秒"],
    ["42度55分33秒", "143度13分44秒"],
    ["42度41分58秒", "143度03分30秒"],
    ["42度43分57秒", "143度06分32秒"],
    ["42度56分48秒", "143度16分11秒"],
    ["42度54分48秒", "143度16分55秒"],
    ["42度54分37秒", "143度21分23秒"],
    ["43度05分40秒", "143度30分59秒"],
    ["42度55分52秒", "143度26分36秒"],
    ["42度55分11秒", "143度28分35秒"],
    ["42度47分57秒", "143度28分18秒"],
    ["42度46分27秒", "143度35分50秒"],
    ["42度44分03秒", "143度40分27秒"]
];

var positions = [];

positions_raw.forEach(function(d){
    function parseLonLat(x){
        var reg = new RegExp("[度分秒]");
        var row = x.split(reg);
        return +row[0] + (+row[1])/60 + (+row[2])/60/60;
    }
    var lat = parseLonLat(d[0]);
    var lon = parseLonLat(d[1]);
    positions.push([lon,lat]);
});

var domains = [[466.96,486.05],
[11.93,707.31],
[16.75,647.93],
[398.42,401.26],
[342.76,345.53],
[247.86,249.42],
[100.28,104.18],
[74.59,79.38],
[33.35,36.67],
[186.87,188.98],
[142.82,145.69],
[27.51,30.19],
[22.7,26.9],
[14.08,20.24],
[34.35,36.64],
[9.95,15.51],
[12.9,16.54],
[7.74,13.59],
[2.07,5.36],
[0.07,3.2]];

function init(){
    /* 値変換 */
    function row(d){
        Object.keys(d).forEach(function(k){
            if(k=="datetime") d[k] = new Date(d[k]);
            else d[k] = +d[k];
        });
        return d;
    }
    function get_row(data,target_index){
        var target_row = [];
        Object.keys(data[target_index]).forEach(function(k){
            if(k!="datetime") target_row.push(data[target_index][k]);
        });
        return target_row;
    }
    function get_datetime(data,target_index){
        return data[target_index]["datetime"];
    }
    function ready(data){
        var d = data;
        var target_index = 0;
        var target_row = get_row(data,target_index);
        update(target_row);
        d3.select("#index-selector").attr("max", data.length-1);
        d3.select("#index-selector").on("change", function(){update(get_row(d,this.value),get_datetime(d,this.value))});
        setInterval(function(){
            target_index++;
            if(target_index>data.length-1) target_index = 0;
            d3.select("#index-selector").property("value", target_index);
            update(get_row(d,target_index),get_datetime(d,target_index));
        }, 100);

    }
    function update_rect(target_row,target_datetime){
        var rects = svg.selectAll("rect")
        .data(target_row);
        rects.enter()
        .append("rect");
        rects.exit().remove();
        rects.attr("class", "bar")
        .attr("x", function(d,i){
            var x = (i+1) * 12;
            return x;
        })
        .attr("y", function(d,i){
            var y = rangeY - scalesY[i](d);
            return y;
        })
        .attr("width", 10)
        .attr("height", function(d,i) {
            return scalesY[i](d);
        });
        text_date.text(target_datetime);
    }
    function update(target_row,target_datetime){
        text_date.text(target_datetime);
        var circles = svg.selectAll("circle")
        .data(target_row);
        circles.enter()
        .append("circle");
        circles.exit().remove();
        circles.attr("cx", function(d,i){
            var x = projection(positions[i])[0];
            return x;
        }).attr("cy", function(d,i){
            var y = projection(positions[i])[1];
            return y;
        })
        .attr("r", function(d,i) {
            return scalesY[i](d);
        })
        .attr("fill", function(d,i){
            return colorScales[i](d);
        });
    }
    var rangeY = 40;
    var scalesY = [];
    domains.forEach(function(d){
        scalesY.push( d3.scaleLinear()
        .domain(d)
        .range([0,rangeY]));
    });
    var colorScales = [];
    domains.forEach(function(d){
        colorScales.push( d3.scaleLinear()
        .domain(d)
        .range(["blue","red"]));
    });
    

    var svg = d3.select("#drawarea").attr("width", 800).attr("height", 620);
    var text_date;

    var projection;
    d3.json("./data/hokkaido_topo.json",function(geodata_topo){

        var hokkaido_geo = topojson.merge(geodata_topo,geodata_topo.objects.hokkaido.geometries.filter(function(d){return d.properties.N03_001 == "北海道"}));

        var tokachi_geo = topojson.merge(geodata_topo,geodata_topo.objects.hokkaido.geometries.filter(function(d){return d.properties.N03_002 == "十勝総合振興局"}));

        projection = d3.geoMercator()
		.scale(18000)
		.translate([300,120])
		.center(d3.geoCentroid(hokkaido_geo));

        var path = d3.geoPath().projection(projection);
        svg.append("path")
            .datum(hokkaido_geo)
            .attr("d",path)
            .attr("fill","#ddddcc");

        var path = d3.geoPath().projection(projection);
        svg.append("path")
            .datum(tokachi_geo)
            .attr("d",path)
            .attr("fill","#ffccbb");

        text_date = d3.select("#drawarea").append("text").attr("x",0).attr("y",600).text("");

        d3.csv("./data/river_height_satsunai.csv").row(row).get(ready);
    });

}

init();

