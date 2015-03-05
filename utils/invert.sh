find . -type f -name "*.mp3" -exec sh -c '
  sox "$0" ${0%.mp3}-inverted.mp3 swap
' {} \;