export const sceneLayout = [
  {
    "id": 2020,
    "label": "Кузница",
    "x": 250,
    "y": -445,
    "width": 372,
    "height": 129
  },
  {
    "id": 1001,
    "label": "Призыв",
    "x": -135,
    "y": -445,
    "width": 372,
    "height": 129
  },
  {
    "id": 1304,
    "label": "Магические исследования",
    "x": -212,
    "y": -231,
    "width": 372,
    "height": 129
  },
  {
    "id": 1013,
    "label": "Коллекция",
    "x": 245,
    "y": -175,
    "width": 376,
    "height": 129
  },
  {
    "id": 1301,
    "label": "Храм звёзд",
    "x": 75,
    "y": 672,
    "width": 372,
    "height": 129
  },
  {
    "id": 1008,
    "label": "Дворец героев",
    "x": -193,
    "y": 436,
    "width": 372,
    "height": 129
  },
  {
    "id": 1005,
    "label": "Гильдия",
    "x": 255,
    "y": 380,
    "width": 372,
    "height": 129
  },
  {
    "id": 1003,
    "label": "Магазин",
    "x": -268,
    "y": 76,
    "width": 372,
    "height": 129
  },
  {
    "id": 1305,
    "label": "Ангелы",
    "x": 230,
    "y": 100,
    "width": 372,
    "height": 129
  }
] as const;
// Original prefab node 10 is inactive and shares the Angels position.
// Enable only when the corresponding gameplay module is implemented.
export const deferredCityModules = [{id:1055,label:'Сокровищница',x:230,y:100,width:372,height:129,active:false}] as const;
