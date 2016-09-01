
var domains = {
"s301081281107010":[344.37, 347.52],
"s301081281107020":[142.47,144.09],
"s301081281107040":[60.03,64.79],
"s301081281107050":[31.67,38.07],
"s301081281107055":[21.28,28],
"s301081281107060":[8.86,18.74],
"s301081281107070":[2.35,12.68],
"s301081281107090":[-0.28,1.84],
"s301081281107100":[475.47,477.69],
"s301081281107110":[481.92,485.31],
"s301081281107135":[61.42,64.28],
"s301081281107145":[41.31,44.3],
"s301081281107150":[204.48,207.15],
"s301081281107160":[71.25,74.45],
"s301081281107170":[31.19,34.46],
"s301081281107180":[495.38,497.65],
"s301081281107195":[398.09,401.26],
"s301081281107200":[342.45,345.53],
"s301081281107210":[247.72,249.42],
"s301081281107220":[100.28,104.18],
"s301081281107230":[74.19,79.38],
"s301081281107240":[32.28,36.67],
"s301081281107250":[186.87,188.98],
"s301081281107260":[142.53,145.69],
"s301081281107280":[27.29,30.19],
"s301081281107290":[22.33,26.9],
"s301081281107300":[13.56,20.24],
"s301081281107320":[33.55,37.34],
"s301081281107330":[9.19,15.51],
"s301081281107350":[12.39,17.08],
"s301081281107360":[7.46,13.59],
"s301081281107370":[1.37,5.42],
"s301081281107400":[-0.15,3.2]
}

function init(){
    var rangeY = 40;
    var siteinfos = {};
    var scalesY = [];
    var colorScales = [];
    var positions = [];
    var text_date;
    var projection;    
    var svg = d3.select("#drawarea").attr("width", 800).attr("height", 620);

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

        Object.keys(domains).forEach(function(k){
            scalesY.push( d3.scaleLinear()
            .domain(domains[k])
            .range([0, rangeY]));

            colorScales.push( d3.scaleLinear()
            .domain(domains[k])
            .range(["blue","red"]));

            positions.push( siteinfos[k].coordinate );
        });

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
            var v = scalesY[i](d);
            if(v<0) v = 1;
            return v;
        })
        .attr("fill", function(d,i){
            return colorScales[i](d);
        });
    }

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


        d3.csv("./data/siteinfo.csv")
          .get(function(data){
            data.forEach(function(d){siteinfos[d.site_id]=d})
            console.log(siteinfos);
            d3.csv("./data/waterlevel_201608.csv").row(row).get(ready);
          })
          .row(function(d){
                function parseLonLat(x){
                    var reg = new RegExp("[度分秒]");
                    var row = x.split(reg);
                    return +row[0] + (+row[1])/60 + (+row[2])/60/60;
                }
                Object.keys(d).forEach(function(k){
                    if(k=="coordinate") {
                        var lon,lat;
                        var row = d[k].split(" ");
                        lat = parseLonLat(row[1]);
                        lon = parseLonLat(row[3]);
                        d[k] = [lon,lat];
                    }
                });
                return d;
          });
    });

}

init();

