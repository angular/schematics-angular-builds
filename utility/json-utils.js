"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function appendPropertyInAstObject(recorder, node, propertyName, value, indent) {
    const indentStr = _buildIndent(indent);
    let index = node.start.offset + 1;
    if (node.properties.length > 0) {
        // Insert comma.
        const last = node.properties[node.properties.length - 1];
        const { text, end } = last;
        const commaIndex = text.endsWith('\n') ? end.offset - 1 : end.offset;
        recorder.insertRight(commaIndex, ',');
        index = end.offset;
    }
    const content = JSON.stringify(value, null, indent).replace(/\n/g, indentStr);
    recorder.insertRight(index, (node.properties.length === 0 && indent ? '\n' : '')
        + ' '.repeat(indent)
        + `"${propertyName}":${indent ? ' ' : ''}${content}`
        + indentStr.slice(0, -indent));
}
exports.appendPropertyInAstObject = appendPropertyInAstObject;
function insertPropertyInAstObjectInOrder(recorder, node, propertyName, value, indent) {
    if (node.properties.length === 0) {
        appendPropertyInAstObject(recorder, node, propertyName, value, indent);
        return;
    }
    // Find insertion info.
    let insertAfterProp = null;
    let prev = null;
    let isLastProp = false;
    const last = node.properties[node.properties.length - 1];
    for (const prop of node.properties) {
        if (prop.key.value > propertyName) {
            if (prev) {
                insertAfterProp = prev;
            }
            break;
        }
        if (prop === last) {
            isLastProp = true;
            insertAfterProp = last;
        }
        prev = prop;
    }
    if (isLastProp) {
        appendPropertyInAstObject(recorder, node, propertyName, value, indent);
        return;
    }
    const indentStr = _buildIndent(indent);
    const insertIndex = insertAfterProp === null
        ? node.start.offset + 1
        : insertAfterProp.end.offset + 1;
    const content = JSON.stringify(value, null, indent).replace(/\n/g, indentStr);
    recorder.insertRight(insertIndex, indentStr
        + `"${propertyName}":${indent ? ' ' : ''}${content}`
        + ',');
}
exports.insertPropertyInAstObjectInOrder = insertPropertyInAstObjectInOrder;
function appendValueInAstArray(recorder, node, value, indent = 4) {
    const indentStr = _buildIndent(indent);
    let index = node.start.offset + 1;
    if (node.elements.length > 0) {
        // Insert comma.
        const last = node.elements[node.elements.length - 1];
        recorder.insertRight(last.end.offset, ',');
        index = indent ? last.end.offset + 1 : last.end.offset;
    }
    recorder.insertRight(index, (node.elements.length === 0 && indent ? '\n' : '')
        + ' '.repeat(indent)
        + JSON.stringify(value, null, indent).replace(/\n/g, indentStr)
        + indentStr.slice(0, -indent));
}
exports.appendValueInAstArray = appendValueInAstArray;
function findPropertyInAstObject(node, propertyName) {
    let maybeNode = null;
    for (const property of node.properties) {
        if (property.key.value == propertyName) {
            maybeNode = property.value;
        }
    }
    return maybeNode;
}
exports.findPropertyInAstObject = findPropertyInAstObject;
function _buildIndent(count) {
    return count ? '\n' + ' '.repeat(count) : '';
}
