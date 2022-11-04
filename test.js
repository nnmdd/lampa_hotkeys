filter.onCheck = (type, a, b)=>{
            let data = Lampa.Storage.get('torrents_filter','{}'),
                need = Lampa.Arrays.toArray(data[a.stype])

            if(b.checked && need.indexOf(b.title)) need.push(b.title)
            else if(!b.checked) Lampa.Arrays.remove(need, b.title)

            data[a.stype] = need

            Lampa.Storage.set('torrents_filter',data)

            a.subtitle = need.join(', ')

            this.applyFilter()
        }
