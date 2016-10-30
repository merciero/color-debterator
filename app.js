var FS = require('fs');
var XML2JS = require('xml2js');
var CHALK = require('chalk');
var COLOR_DIFF = require('./lib/diff');
var CONVERT = require('color-convert');
var REPLACE = require("replace");


var PARSER = new XML2JS.Parser();

var ARGS = process.argv.slice(2);
var FILE_INPUT = ARGS[0];
var FILE_TARGET_PALETTE = ARGS[1];
var TOLERANCE = ARGS[2];


function printError(error) {
    console.error(CHALK.red(error));
}

/**
 * Returns ciede2000 for colors with non alpha layer, otherwise returns an arbitrary distance value or null if could
 * not compare a color with alpha value with another one
 * @param inputColor
 * @param targetColor
 */
function getColorDistance(inputColor, targetColor) {
    var bothWithTransparency = (inputColor.a !== 255 && targetColor.a !== 255);


    var inputColorLab = CONVERT.rgb.lab(inputColor.r, inputColor.g, inputColor.b);
    var targetColorLab = CONVERT.rgb.lab(targetColor.r, targetColor.g, targetColor.b);
    var rgbChannelDiff = COLOR_DIFF.ciede2000(inputColorLab, targetColorLab); // without alpha
    var globalDistance = null;

    if (inputColor.a === targetColor.a) { // If alpha channels are the same, normal color comparision

        globalDistance = rgbChannelDiff;

    } else if (bothWithTransparency) { // Comparing a transparent with another transparent only

        // Arbitrary formula, should be replaced by something scientific
        globalDistance = rgbChannelDiff + Math.pow( Math.pow(inputColor.a - targetColor.a, 2), 1/2);
    }

    return globalDistance;
}

/**
 *
 * @param xmlValue
 * returns object with properties 'name', 'a', 'r', 'g', 'b' (xml name, alpha, red, green, blue)
 */
function parseColorValues(name, xmlValue) {
    var originalXmlValue = xmlValue;
    xmlValue = xmlValue.substring(1, xmlValue.length);

    if (xmlValue.length === 3 || xmlValue.length === 4) { // RGB or ARGB, needs to be AARRGGBB
        var newXmlValue = "";
        for (var i = 0, len = xmlValue.length; i < len; i++) {
            newXmlValue += (xmlValue[i]) + (xmlValue[i]);
        }
        xmlValue = newXmlValue;
    }

    if (xmlValue.length === 6) { // RRGGBB
        xmlValue = 'FF' + xmlValue; // adding alpha channel
    }

    // Now we have AARRGGBB for all

    return {
        'name': name,
        'originalXmlValue': originalXmlValue,
        'a': parseInt(xmlValue.substring(0, 2), 16),
        'r': parseInt(xmlValue.substring(2, 4), 16),
        'g': parseInt(xmlValue.substring(4, 6), 16),
        'b': parseInt(xmlValue.substring(6, 8), 16)
    }
}

function parseColorsFromFile(filePath) {
    return new Promise(
        function (resolve, reject) {
            FS.readFile(filePath, function(err, data) {
                PARSER.parseString(data, function (err, result) {
                    if (!err) {
                        var parsedColors = {
                            'source': [],       // When it is defining a color
                            'linked': []        // When it is referencing a color
                        };

                        result.resources.color.forEach(function(colorEntry) {
                            var xmlColor = {
                                'name': colorEntry['$'].name,
                                'value': colorEntry['_']
                            };

                            if (0 === xmlColor.value.indexOf('#')) {
                                parsedColors.source.push(parseColorValues(xmlColor.name, xmlColor.value));
                            } else if (0 === xmlColor.value.indexOf('@color/')) {
                                parsedColors.linked.push(xmlColor);
                            } else {
                                reject(new Error(`Cannot support <color name="${xmlColor.name}">${xmlColor.value}</color>`));
                            }
                        });

                        resolve(parsedColors);
                    } else {
                        reject(err);
                    }
                });
            });
        }
    );
}

/**
 * Adds a 'closeTarget': {    property to each input color
 *          'name': ...
 *          'distance': ...
 *        }
 *
 *
 * @param input
 * @param target
 */
function computeDistances(input, target) {
    for (var i=0 ; i < input.length ; ++i) {
        input[i]['closeTarget'] = {
            'name': null,
            'distance': Number.MAX_VALUE
        };

        target.forEach(function(targetColor) {
            var thisColorDistance = getColorDistance(input[i], targetColor);
            if (thisColorDistance !== null && thisColorDistance < input[i].closeTarget.distance) {
                input[i].closeTarget.name = targetColor.name;
                input[i].closeTarget.distance = thisColorDistance;
            }
        });
    }
}

function applyPaletteToInput(inputColors) {
    inputColors.forEach(function(inputColor) {
        var hasTransparency = inputColor.a !== 255;
        if (inputColor.closeTarget.distance <= TOLERANCE) {
            var logContent = `Replacing ${inputColor.originalXmlValue} by @color/${inputColor.closeTarget.name}`;
            if (hasTransparency) {
                console.log(CHALK.yellow(logContent)); // we need to be extra careful of colors with transparency
            } else {
                console.log(logContent);
            }

            REPLACE({
                regex: `>${inputColor.originalXmlValue}<`,
                replacement: `>@color/${inputColor.closeTarget.name}<`,
                paths: [FILE_INPUT],
                recursive: false,
                silent: true
            });

        } else {
            var logContent = `${inputColor.originalXmlValue} is too far from ${inputColor.closeTarget.name} (Distance ${inputColor.closeTarget.distance} > ${TOLERANCE} )`;
            if (hasTransparency) {
                console.log(CHALK.yellow(logContent)); // we need to be extra careful of colors with transparency
            } else {
                console.log(logContent);
            }

        }
    });

}

function printColorStats(description, colorForStats) {
    console.log(CHALK.blue(`${description} has ${colorForStats.source.length} defined colors and ${colorForStats.linked.length} referenced colors`));
}

Promise.all([
        parseColorsFromFile(FILE_INPUT),
        parseColorsFromFile(FILE_TARGET_PALETTE),
    ])
    .then(([inputColors, targetColors]) => {
        computeDistances(inputColors.source, targetColors.source);

        console.log("Input: " + JSON.stringify(inputColors.source, null, 2));
        printColorStats("Original input", inputColors);
        var initialCount = inputColors.source.length;

        applyPaletteToInput(inputColors.source);
        parseColorsFromFile(FILE_INPUT).then((finalColors) => {
            printColorStats("Updated file", finalColors);
            var updatedCount = finalColors.source.length;
            console.error(CHALK.green(`color-debterator kill stats: ${Math.round(100 - (100 * updatedCount / initialCount))}%`));
        });

    })
    .catch(err => {
        printError(err);
    });
