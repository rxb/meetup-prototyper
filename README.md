prototype-builder
=================

Quickly build prototypes with parts grabbed directly off Sassquatch docs, with live Meetup data.

__This is a work in progress.__ Running the setup script does not create a viewable webpage.


## Setup
For development or testing, set up a local Ruby environment with `rbenv`. If you're using __RVM__, [switch to rbenv](https://gist.github.com/akdetrick/7604130). If you're on a Mac, install `rbenv` with [Homebrew](http://brew.sh/), then run the following command.

```sh
$ rbenv install
```

then run the setup script install bower and ruby dependencies

```sh
$ ./setup.sh
```

If you get permissions errors, make sure you have the local `rbenv` set up correctly - the install script should not need access to the global Ruby environment.
