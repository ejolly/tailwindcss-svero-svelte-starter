// This allows the use of the tailwind @apply directive within component's scoped styles
module.exports = {
   preprocess: {
      style: async ({content, attributes}) => {
         if (attributes.type !== 'text/postcss') return;
         return new Promise((resolve, reject) => {
            resolve({code: '', map: ''});
         });
      },
   },
};
