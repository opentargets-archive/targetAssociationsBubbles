function decorateSVG(from_svg) {
    var clone = from_svg.cloneNode(true);
    // Remove the defs and the therapeutic area labels
    d3.select(clone)
        .select("defs")
        .remove();
    d3.select(clone)
        .selectAll(".topLabel")
        .remove();

    // Move the bubbles view to the right to leave space for the new TA labels
    // var currWidth = d3.select(clone).attr("width");
    // d3.select(clone).attr("width", ~~currWidth + offset);
    // d3.select(clone).select("g").attr("transform", "translate(" + offset + ",0)");

    // Get all therapeutic area labels on a side
    var g = d3.select(clone).select("g");
    var root = d3.select(".bubblesViewRoot")
        .datum();

    function okOverlaps(p, angle, others) {
        for (var o in others) {
            // Overlap
            if ((Math.abs(others[o].y - p.y) < 10) && (Math.abs(angle - others[o].angle) < 0.2)) {
                return false;
            }
        }
        return true;
    }

    function getPos(init, angle) {
        var p = {};
        p.x = init.x + (init.r * Math.cos(angle));
        p.y = init.y + (init.r * Math.sin(angle));
        return p;
    }

    var labelPositions = {};
    var taBubbles = d3.selectAll(".bubblesViewInternal")
        .each(function (d, i) {
            // i=0 is the root circle
            if (!i) {
                return;
            }
            // Calculate angle
            var angleRadians = Math.atan2(d.y - root.y, d.x - root.x);

            //angleRadians = angleRadians < 0 ? angleRadians + 360 : angleRadians;
            // Find the projection of the line in the root bubble
            var ok = false;
            var p1 = getPos(d, angleRadians);
            var p2;
            var ntries = 0;
            while (!ok && ntries < 50) {
                ntries++;
                p2 = getPos(root, angleRadians);
                ok = okOverlaps(p2, angleRadians, labelPositions);
                // ok = true;
                if (!ok) {
                    if ((angleRadians > 0) && (angleRadians < 90)) {
                        angleRadians = angleRadians - 0.02;
                    } else if ((angleRadians > 90) && (angleRadians < 180)) {
                        angleRadians = angleRadians + 0.02;
                    } else if ((angleRadians < 0) && (angleRadians > -90)) {
                        angleRadians = angleRadians + 0.02;
                    } else {
                        angleRadians = angleRadians - 0.02;
                    }
                    //angleRadians = angleRadians + 0.02;
                }
            }
            labelPositions[d.__id] = {
                x: p2.x,
                y: p2.y,
                angle: angleRadians
            };
            //var p = getPos(d, angleRadians);
            // var x1 = d.x + (d.r * Math.cos(angleRadians));
            // var y1 = d.y + (d.r * Math.sin(angleRadians));
            // var x2 = root.x + (root.r * Math.cos(angleRadians));
            // var y2 = root.y + (root.r * Math.sin(angleRadians));

            g
                .append("line")
                .attr("class", "TA-label")
                .attr("x1", p1.x)
                .attr("y1", p1.y)
                .attr("x2", p2.x)
                .attr("y2", p2.y)
                .attr("stroke", "gray");
            g
                .append("g")
                .attr("transform", "translate(" + p2.x + "," + p2.y + ")")
                .append("text")
                .style("font-size", "12px")
                .style("text-anchor", function () {
                    var angle = (angleRadians * 180 / Math.PI);
                    if ((angle < -90) || (angle > 90)) {
                        return "end";
                    }
                    return "start";
                })
                .text(function () {
                    return d.name;
                });
        });

    // Resize the whole div
    var longestLabel = "";
    taBubbles
        .each(function (d) {
            if (d.name.length > longestLabel.length) {
                longestLabel = d.name;
            }
        });
    var l = longestLabel.length * 6;
    var currWidth = ~~d3.select(clone).attr("width");
    var currHeight = ~~d3.select(clone).attr("height");
    d3.select(clone)
        .attr("width", currWidth + l * 2)
        .attr("height", currHeight + 50);
    g.attr("transform", "translate(" + l + "," + "25)");

    return clone;
}


// var svg = decorateSVG(elem.children().eq(0)[0].querySelector("svg"));

function exportPNG (elem) {
    var svg = decorateSVG(elem.querySelector("svg"));

        // TODO: Set max_size to 2100000
        var pngExporter = tnt.utils.png()
            .filename("image.png");

        pngExporter(d3.select(svg));
}
