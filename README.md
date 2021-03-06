# color-debterator
Helper that reduces the amount of color xml entries in an Android application with tech debt

# Usage instructions
Place the set of colors you ideally want your app to use in a separate android color resource file.
The tolerance value is based on the [ciede2000](http://www.ece.rochester.edu/~gsharma/ciede2000/ciede2000noteCRNA.pdf) algorithm value for colors without transparency, and is arbitrary for colors with transparency.
Values up to 20 are still visually close, 100 is the maximum difference for non transparent colors
```sh
$ git clone https://github.com/merciero/color-debterator.git
$ cd color-debterator
$ npm install
$ node app.js <path_color_file.xml> <path_color_palette_file.xml> <tolerance_value>
```

# Before / After

Example with a tolerance value of '20'

![BeforeAfter](/images/before_after.png)

# Output

You should get the following:

![ScreenShot](/images/sample.png)

# More info

[You can check out the youtube video that showcases the tool](https://www.youtube.com/watch?v=j65MFLd1w9A)
