# color-debterator
Helper that reduces the amount of color xml entries in an Android application with tech debt

# Usage instructions
Place the set of colors you ideally want your app to use in a separate android color resource file.
The tolerance value is based on the [ciede2000](http://www.ece.rochester.edu/~gsharma/ciede2000/ciede2000noteCRNA.pdf) algorithm value for colors without transparency, and is arbitrary for colors with transparency.
Values to to 20 are still visually close, 100 is the maximum difference for non transparent colors
```sh
$ git clone https://github.com/merciero/color-debterator.git
$ cd color-debterator
$ npm install
$ node app.js <path_to_your_main_android_color_file.xml> <path_to_your_android_color_palette_file.xml> <tolerance_value>
```