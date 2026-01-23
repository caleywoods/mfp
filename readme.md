# Mazes For Programmers

This is a repo to hold code for the topics in the book
[Mazes For Programmers](https://pragprog.com/book/jbmaze/mazes-for-programmers)
by Jamis Buck.

The original works in the book are implemented in Ruby. This project uses
JS (Typescript soon) and the Canvas API to create the mazes.

![Maze Examples](https://i.imgur.com/LKWZHuR.png)

## Running this repo
* `git clone` this repo
* `npm install`
* `npm start`
    - This builds the site and serves the production build locally.
* If you'd like a dev server instead, run `npm run dev`
* If you'd like to make the mazes larger, play with the `gridConfig` variable in `app.js`
    - You can increase or decrease the pixel size of the cells and increase or decrease the rows and columns in the maze
