# Mazes For Programmers

This is a repo to hold code for the topics in the book
[Mazes For Programmers](https://pragprog.com/book/jbmaze/mazes-for-programmers)
by Jamis Buck.

The original works in the book are implemented in Ruby. This project uses
JS (Typescript soon) and the Canvas API to create the mazes.

![Maze Examples](https://i.imgur.com/LKWZHuR.png)

## Running this repo
* `git clone` this repo
* make sure you have [http-server](https://www.npmjs.com/package/http-server) or some other way to serve the files locally
* `cd` into the directory and run `http-server`, this starts a local http server usually on `http://localhost:8080`
* browse to `http://localhost:8080/index.html` (if you configured a different port, use that)
* If you'd like to make the mazes larger, play with the `gridConfig` variable in `app.js`
    - You can increase or decrease the pixel size of the cells and increase or decrease the rows and columns in the maze
