import { type CSSProperties, type Component } from 'vue';
export type Style = CSSProperties;
export interface WindowStyle {
    window: Style;
    titlebar: Style;
    content: Style;
    button: Style;
    buttonHover: Style;
    buttonActive: Style;
}
export declare const WINDOW_STYLE_KEY = "@hscmap/vue-window/windowStyle";
export declare function StyleFactory(windowStyle: WindowStyle): Component & {
    readonly windowStyle: WindowStyle;
};
export declare const StyleBlack: Component & {
    readonly windowStyle: WindowStyle;
};
export declare const StyleWhite: Component & {
    readonly windowStyle: WindowStyle;
};
export declare const StyleMetal: Component & {
    readonly windowStyle: WindowStyle;
};
