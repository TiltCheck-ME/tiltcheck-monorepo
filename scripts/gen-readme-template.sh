#!/bin/bash
# Generate README template for a new TiltCheck module
MODULE_PATH="$1"
MODULE_NAME=$(basename "$MODULE_PATH")
README="$MODULE_PATH/README.md"

if [ -z "$MODULE_PATH" ]; then
  echo "Usage: $0 <module-path>"
  exit 1
fi

if [ -f "$README" ]; then
  echo "README already exists: $README"
  exit 0
fi

cat > "$README" <<EOF
# $MODULE_NAME

## Purpose
Describe what this module does and its role in the TiltCheck ecosystem.

## Events Consumed
- 

## Events Emitted
- 

## Primary Data Structures
- 

## Example Usage
```typescript
// ...
```

---
*Auto-generated. Fill in details as you migrate code.*
EOF

echo "README template created: $README"
