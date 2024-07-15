// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow icon-glyph: calendar;
const VERSION = '1.0.0';

const DEBUG = false;
const log = (args) => {

    if (DEBUG) {
        console.log(args);
    }
};

const ARGUMENTS = {
    widgetTitle: 'D-day',
    rememberDay: '1970-01-01',
    // desired interval in minutes to refresh the
    // widget. This will only tell IOS that it's
    // ready for a refresh, whether it actually 
    // refreshes is up to IOS
    refreshInterval: 60, //mins
    fontColor: Device.isUsingDarkAppearance() ? Color.white() : Color.darkGray(),
    backgroundColor: Device.isUsingDarkAppearance() ? Color.darkGray() : Color.white()
};
Object.seal(ARGUMENTS);

const MENU_PROPERTY = {
    rowDismiss: true,
    rowHeight: 50,
    subtitleColor: Color.lightGray()
};
Object.freeze(MENU_PROPERTY);

const CommonUtil = {
    isNumber: (value) => {
        let isValid = false;
    
        if (typeof value === 'number') {
            isValid = true;
        } else if (typeof value === 'string') {
            isValid = /^\d{1,}$/.test(value);
        }
    
        return isValid;
    },
    compareVersion: (version1 = '', version2 = '') => {
        version1 = version1.replace(/\.|\s|\r\n|\r|\n/gi, '');
        version2 = version2.replace(/\.|\s|\r\n|\r|\n/gi, '');

        if (!CommonUtil.isNumber(version1) || !CommonUtil.isNumber(version2)) {
            return false;
        }

        return version1 < version2;
    }
};

const DDayClient = {
    //----------------------------------------------
    initialize: () => {
        try {
            this.USES_ICLOUD = module.filename.includes('Documents/iCloud~');
            this.fm = this.USES_ICLOUD ? FileManager.iCloud() : FileManager.local();
            this.root = this.fm.joinPath(this.fm.documentsDirectory(), '/cache/d-day');
            this.resourcePath = this.fm.joinPath(this.root, 'picture.png');
            this.fm.createDirectory(this.root, true);
        } catch (e) {
            log(e.message);
        }
    },
    setResource: async (image) => {
        this.fm.writeImage(this.resourcePath, image);
    },
    //----------------------------------------------
    getResource: async () => {

        if (this.fm.fileExists(this.resourcePath)) {
            await this.fm.downloadFileFromiCloud(this.resourcePath);
			return this.fm.readImage(this.resourcePath);
        }
        
        return null;
    },
    clearCache: async () => {
        this.fm.remove(this.root);
    },
    //----------------------------------------------
    updateModule: async () => {
        try {
            const latestVersion = await new Request('https://raw.githubusercontent.com/clauzewitz/scriptable-since-i-met-you-widgets/main/version').loadString();

            if (CommonUtil.compareVersion(VERSION, latestVersion)) {
                const code = await new Request('https://raw.githubusercontent.com/clauzewitz/scriptable-since-i-met-you-widgets/main/since_i_met_you.js').loadString();
                this.fm.writeString(this.fm.joinPath(this.fm.documentsDirectory(), `${Script.name()}.js`), code);
                await DDayClient.presentAlert(`Update to version ${latestVersion}\nPlease launch the app again.`);
            } else {
                await DDayClient.presentAlert(`version ${VERSION} is currently the newest version available.`);
            }
        } catch (e) {
            log(e.message);
        }
    },
    //----------------------------------------------
    presentAlert: async (prompt = '', items = ['OK'], asSheet = false) => {
        try {
            const alert = new Alert();
            alert.message = prompt;
    
            items.forEach(item => {
                alert.addAction(item);
            });
    
            return asSheet ? await alert.presentSheet() : await alert.presentAlert();
        } catch (e) {
            log(e.message);
        }
    }
};

const createWidget = async (data) => {
    const widget = new ListWidget();
    widget.refreshAfterDate = new Date((Date.now() + (1000 * 60 * ARGUMENTS.refreshInterval)));
    widget.backgroundColor = ARGUMENTS.backgroundColor;

    if (config.runsInAccessoryWidget) {
        widget.useDefaultPadding();
        
        if (config.widgetFamily == 'accessoryCircular') {
            widget.addAccessoryWidgetBackground = true;
        }

		const symbol = widget.addStack();
        symbol.layoutHorizontally();
        symbol.addSpacer();
        
		addSymbol(symbol, 'heart.fill', 15);
        
        symbol.addSpacer();
        
        addText(widget, `${calcDiffDate(ARGUMENTS.rememberDay)?.toLocaleString()}`, 'center', 20, true).minimumScaleFactor = 0.2;
    } else {
    	widget.backgroundImage = await DDayClient.getResource();
        
        const padding = 20;

        widget.setPadding(padding, padding, padding, padding);
        widget.addSpacer();
        
        addSymbol(widget, 'heart.fill', 20);
        addText(widget, `${calcDiffDate(ARGUMENTS.rememberDay)?.toLocaleString()}`, 'center', 60, true).minimumScaleFactor = 0.2;
        
        widget.addSpacer();
    
        addText(widget, `since ${ARGUMENTS.rememberDay}`, 'right').textOpacity = 30;
    }
    
    return widget;
};

const calcDiffDate = (date) => {
    let dateFormatter = new DateFormatter();
    dateFormatter.dateFormat = 'yyyy-MM-dd';

    let presentdate = new Date().getTime();
    let targetDate = dateFormatter.date(date || 0).getTime();

    return Math.floor(Math.abs((targetDate - presentdate) / (1000 * 60 * 60 * 24)) ?? 0) + 1;
};

const addImage = (container, image, size) => {
    const icon = container.addImage(image);
    icon.imageSize = new Size(size, size);

    return icon;
};

const addSymbol = (container, name, size) => {
    const icon = container.addImage(SFSymbol.named(name).image);
    icon.tintColor = Color.red();
    icon.imageSize = new Size(size,size);

    return icon;
};

const addText = (container, text, align = 'center', size = 12, isBold = false) => {
    const txt = container.addText(text);
    txt[`${align}AlignText`]();
    txt.font = isBold ? Font.boldSystemFont(size) : Font.systemFont(size);
    txt.textColor = ARGUMENTS.fontColor;
    return txt;
};

const checkWidgetParameter = () => {

    if (args.widgetParameter) {
        const aWidgetParameter = args.widgetParameter.split(/\s*\|\s*/);

        switch (aWidgetParameter.length) {
            case 1:
            default:

                if (aWidgetParameter.length > 0) {
                    ARGUMENTS.rememberDay = aWidgetParameter[0] || ARGUMENTS.rememberDay;
                }
        }
    }
};

const MENU_ROWS = {
    title: {
        isHeader: true,
        title: `${ARGUMENTS.widgetTitle} Widget`,
        subtitle: `version: ${VERSION}`,
        onSelect: undefined
    },
    checkUpdate: {
        isHeader: false,
        title: 'Check for Updates',
        subtitle: 'Check for updates to the latest version.',
        onSelect: async () => {
            DDayClient.updateModule();
        }
    },
    setPhoto: {
        isHeader: false,
        title: 'Set Widget',
        subtitle: 'Provides a preview for testing.',
        onSelect: async () => {
            const img = await Photos.fromLibrary();
			DDayClient.setResource(img);
            
            const widget = await createWidget();
            
            await widget[`presentLarge`]();
        }
	},
    preview: {
        isHeader: false,
        title: 'Preview Widget',
        subtitle: 'Provides a preview for testing.',
        onSelect: async () => {
            const widget = await createWidget();
            
            await widget[`presentSmall`]();
        }
    },
    clearCache: {
        isHeader: false,
        title: 'Clear cache',
        subtitle: 'Clear all caches.',
        onSelect: async () => {
            await DDayClient.clearCache();
        }
    }
};

checkWidgetParameter();
DDayClient.initialize();

if (config.runsInWidget) {
    const widget = await createWidget();
    Script.setWidget(widget);
} else {
    const menu = new UITable();
    menu.showSeparators = true;

    Object.values(MENU_ROWS).forEach((rowInfo) => {
        const row = new UITableRow();
        row.isHeader = rowInfo.isHeader;
        row.dismissOnSelect = MENU_PROPERTY.rowDismiss;
        row.height = MENU_PROPERTY.rowHeight;
        const cell = row.addText(rowInfo.title, rowInfo.subtitle);
        cell.subtitleColor = MENU_PROPERTY.subtitleColor;
        row.onSelect = rowInfo.onSelect;
        menu.addRow(row);
    });

    await menu.present(false);
}

Script.complete();
