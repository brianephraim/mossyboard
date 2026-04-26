/**
 * Disallow raw text nodes directly inside Tamagui view-like containers.
 *
 * Invalid:
 *   <View>Hello</View>
 *   <XStack>{"Hello"}</XStack>
 *   <Stack>{`Hello`}</Stack>
 *
 * Valid:
 *   <View><Text>Hello</Text></View>
 *   <View><CustomComponent /></View>
 */

const KNOWN_VIEW_LIKE_NAMES = new Set([
  "View",
  "Stack",
  "XStack",
  "YStack",
  "ZStack",
  "Theme",
  "ThemeProvider",
  "Portal",
]);

const KNOWN_TEXT_NAMES = new Set([
  "Text",
  "Paragraph",
  "SizableText",
  "Label",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
]);

const TAMAGUI_SOURCES = new Set(["@tamagui/core", "@tamagui/stacks", "tamagui"]);

function getJsxName(node) {
  if (!node) return null;
  if (node.type === "JSXIdentifier") return node.name;
  if (node.type === "JSXMemberExpression") return node.property?.name ?? null;
  return null;
}

function isStaticTemplateLiteral(expr) {
  return expr.type === "TemplateLiteral" && expr.expressions.length === 0;
}

function isRawTextChild(child) {
  if (child.type === "JSXText") {
    return child.value.trim().length > 0;
  }

  if (child.type === "JSXExpressionContainer") {
    const expr = child.expression;
    if (!expr) return false;

    if (expr.type === "Literal") {
      return typeof expr.value === "string" && expr.value.trim().length > 0;
    }

    if (expr.type === "TemplateLiteral") {
      return isStaticTemplateLiteral(expr) && expr.quasis.some((q) => q.value.cooked?.trim());
    }
  }

  return false;
}

function getImportedName(specifier) {
  if (specifier.type === "ImportSpecifier") {
    return specifier.imported?.name ?? null;
  }

  // Conservative: treat namespace/default imports from Tamagui as view-like candidates.
  if (
    specifier.type === "ImportNamespaceSpecifier" ||
    specifier.type === "ImportDefaultSpecifier"
  ) {
    return "*";
  }

  return null;
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow raw text nodes directly under Tamagui view-like components",
    },
    schema: [],
    messages: {
      rawText: "Raw text cannot be a direct child of {{name}}. Wrap text in <Text>…</Text>.",
    },
  },

  create(context) {
    const tamaguiImports = new Map();
    const viewLikeAliases = new Set();

    function isTamaguiViewLike(localName) {
      if (KNOWN_VIEW_LIKE_NAMES.has(localName)) return true;
      if (viewLikeAliases.has(localName)) return true;

      const imported = tamaguiImports.get(localName);
      if (!imported) return false;

      if (imported === "*") return true;
      if (KNOWN_TEXT_NAMES.has(imported)) return false;

      // If it comes from Tamagui and is not known text-like, treat as view-like.
      return true;
    }

    function isStyledCall(node) {
      return node?.type === "CallExpression" && node.callee?.type === "Identifier";
    }

    function getStyledTargetName(node) {
      if (!isStyledCall(node)) return null;

      const calleeName = node.callee.name;
      if (tamaguiImports.get(calleeName) !== "styled") return null;

      const firstArg = node.arguments?.[0];
      if (!firstArg || firstArg.type !== "Identifier") return null;

      return firstArg.name;
    }

    return {
      ImportDeclaration(node) {
        if (!TAMAGUI_SOURCES.has(node.source?.value)) return;

        for (const specifier of node.specifiers ?? []) {
          const localName = specifier.local?.name;
          const importedName = getImportedName(specifier);
          if (localName && importedName) {
            tamaguiImports.set(localName, importedName);
          }
        }
      },

      VariableDeclarator(node) {
        if (node.id?.type !== "Identifier" || !node.init) return;

        const aliasName = node.id.name;
        const targetName = getStyledTargetName(node.init);
        if (!targetName) return;

        if (isTamaguiViewLike(targetName)) {
          viewLikeAliases.add(aliasName);
        }
      },

      JSXElement(node) {
        const name = getJsxName(node.openingElement?.name);
        if (!name || !isTamaguiViewLike(name)) return;

        for (const child of node.children ?? []) {
          if (!isRawTextChild(child)) continue;

          context.report({
            node: child,
            messageId: "rawText",
            data: { name },
          });
        }
      },
    };
  },
};

export default rule;
