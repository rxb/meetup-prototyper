#!/bin/bash

echo "~~~~~~~~ getting gem system latest..."
gem update --system

echo "~~~~~~~~ getting latest for bundler gem..."
gem install bundler

echo "~~~~~~~~ installing required gems..."
bundle install

echo "~~~~~~~~ installing bower dependencies..."
bower install

exit 0
