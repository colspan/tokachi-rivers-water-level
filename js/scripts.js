
var domains_river = {
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

var domains_dam = {
    "d00_input" : [1.73, 707.31],
    "d00_stocked_amount":[9610, 45498],
    "d00_output": [3.6, 647.93],
    "d01_input" : [0, 995.39],
    "d01_stocked_amount":[641, 61511],
    "d01_output": [0, 267]
}


function init(){
    var range_river_circle = 40;
    var siteinfos = {};
    var scales_river = [];
    var c_scales_river = [];
    var positions = [];

    var range_dam_rectangle = 200;
    var scales_dam = [];
    var c_scales_dam = [];

    var projection;

    var geodata_topo;
    var river_log, dam_log;

    var svg = d3.select("#drawarea_map").attr("width", "100%").attr("height", 660);
    var svg_path = d3.select("#drawarea_path")
    .attr("width", "100%")
    .attr("preserveAspectRatio", "xMinYMax meet")
    .attr("viewBox", "0 0 800 50");
    var text_date;

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

    // 値域定義
    Object.keys(domains_river).forEach(function(k){
        scales_river.push( d3.scaleLinear()
        .domain(domains_river[k])
        .range([0, range_river_circle]));

        c_scales_river.push( d3.scaleLinear()
        .domain(domains_river[k])
        .range(["blue","red"]));
    });

    Object.keys(domains_dam).forEach(function(k){
        scales_dam.push( d3.scaleLinear()
        .domain(domains_dam[k])
        .range([0, range_dam_rectangle]));

        c_scales_dam.push( d3.scaleLinear()
        .domain(domains_dam[k])
        .range(["blue","red"]));
    });

    // データ読み込み
    var p_data_hokkaido = new Promise(function(resolve, reject){
        d3.json("./data/hokkaido_topo.json",function(error, data){
            if(error){
                reject(error);
                return;
            }
            geodata_topo = data;
            resolve(data);
        });
    });
    var p_data_siteinfo = new Promise(function(resolve, reject){
        d3.csv("./data/siteinfo.csv")
          .get(function(error, data){
            if(error){
                reject(error);
                return;
            }
            data.forEach(function(d){siteinfos[d.site_id]=d})
            Object.keys(domains_river).forEach(function(k){
                positions.push( siteinfos[k].coordinate );
            });
            resolve(siteinfos);
          })
          .row(function(d){
            function parseLonLat(x){
                var reg = new RegExp("[度分秒]");
                var row = x.split(reg);
                return +row[0] + (+row[1])/60 + (+row[2])/60/60;
            }
            Object.keys(d).forEach(function(k){
                if(k=="coordinate") {
                    var lon, lat;
                    var row = d[k].split(" ");
                    lat = parseLonLat(row[1]);
                    lon = parseLonLat(row[3]);
                    d[k] = [lon,lat];
                }
            });
            return d;
        });
    });
    var p_data_dam_log = new Promise(function(resolve, reject){
        d3.csv("./data/dam_log.csv").row(row).get(function(error, data){
            if(error){
                reject(error);
                return;
            }
            dam_log = data;
            resolve(data);
        });
    });
    var p_data_river_log = new Promise(function(resolve, reject){
        d3.csv("./data/water_level_log.csv").row(row).get(function(error, data){
            if(error){
                reject(error);
                return;
            }
            river_log = data;
            resolve(data);
        });
    });

    // 処理開始
    Promise.all([p_data_hokkaido, p_data_siteinfo, p_data_dam_log, p_data_river_log]).then(ready);

    function ready(data){
        // 地図描画
        var hokkaido_geo = topojson.merge(geodata_topo,geodata_topo.objects.hokkaido.geometries.filter(function(d){return d.properties.N03_001 == "北海道"}));

        var tokachi_geo = topojson.merge(geodata_topo,geodata_topo.objects.hokkaido.geometries.filter(function(d){return d.properties.N03_002 == "十勝総合振興局"}));

        projection = d3.geoMercator()
		.scale(18000)
		.translate([120,80])
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

        text_date = svg.append("text").attr("x",50).attr("y",600).text("").attr("font-size","56");
        svg.append("text").attr("x",400).attr("y",420).text("札内川ダム").attr("font-size","20");
        svg.append("text").attr("x",505).attr("y",417).text("流入量").attr("font-size","16");
        svg.append("text").attr("x",505).attr("y",439).text("貯水量").attr("font-size","16");
        svg.append("text").attr("x",505).attr("y",461).text("放流量").attr("font-size","16");
        svg.append("text").attr("x",400).attr("y",486).text("十勝川ダム").attr("font-size","20");
        svg.append("text").attr("x",505).attr("y",483).text("流入量").attr("font-size","16");
        svg.append("text").attr("x",505).attr("y",505).text("貯水量").attr("font-size","16");
        svg.append("text").attr("x",505).attr("y",527).text("放流量").attr("font-size","16");

        draw_dam_level_path();

        var target_index = 0;
        var target_row = get_row(river_log,target_index);
        var target_interval;
        var update_index = function(){
            target_index += 1;
            if(target_index>river_log.length-1) target_index = 0;
            d3.select("#index-selector").property("value", target_index);
            update_river(get_row(river_log,target_index),get_datetime(river_log,target_index));
            update_dam(get_row(dam_log,target_index),get_datetime(dam_log,target_index));
        }
        d3.select("#index-selector").attr("max", river_log.length-1);
        d3.select("#index-selector").on("input", function(){
            clearInterval(target_interval);
            update_river(get_row(river_log,this.value),get_datetime(river_log,this.value));
            update_dam(get_row(dam_log,this.value),get_datetime(dam_log,this.value));
        });
        d3.select("#index-selector").on("change", function(){
            target_index = +this.value;
            target_interval = setInterval(update_index, 100);
        });
        target_interval = setInterval(update_index, 100);

    }
    // 共通処理
    var timeFormat = d3.timeFormat("%Y/%m/%d %H:%M");
    function update_river(target_row,target_datetime){
        var alert_counter = 0;
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
            var v = scales_river[i](d);
            if(v<0) v = 1;
            if(v>range_river_circle*0.8) alert_counter++; // 水位が大きくなったら警告フラグ発動
            return v;
        })
        .attr("fill", function(d,i){
            return c_scales_river[i](d);
        });

        text_date.text(timeFormat(target_datetime));
        text_date.style("fill", alert_counter > 2 ? "red" : "black");
    }

    function update_dam(target_row,target_datetime){
        var rects = svg.selectAll("rect")
        .data(target_row);
        rects.enter()
        .append("rect");
        rects.exit().remove();
        rects.attr("x", 560)
        .attr("y", function(d,i){
            var y = (i+1) * 22 + 380;
            return y;
        })
        .attr("height", 18)
        .attr("width", function(d,i) {
            var y = scales_dam[i](d);
            if(y<0) y=1;
            return y;
        })
        .attr("fill", function(d,i){
            return c_scales_dam[i](d);
        });
    }

    var dam_level_path_x, dam_level_path_y;
    function draw_dam_level_path(){
        var window_width = 800;
        var dam_level_path_x = d3.scaleLinear()
        .domain([0,dam_log.length])
        .range([0, window_width]);
        var dam_level_path_y = d3.scaleLinear()
        .domain(domains_dam.d00_input)
        .range([50, 0]);

        svg_path.append("path").datum(dam_log);
        var line = d3.line()
        .x(function(d,i) { return dam_level_path_x(i); })
        .y(function(d) { return dam_level_path_y(d.d00_input); });
        svg_path.select("path")
        .attr("d", line)
        .attr("fill","#aaaadd");
    }

}

init();

