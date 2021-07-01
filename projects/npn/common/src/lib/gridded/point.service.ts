import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

@Injectable()
export class PointService {

    constructor(
        private http: HttpClient
    ) {}

    getAcisClimateData(start_date, end_date) {
        let url = 'https://data.rcc-acis.org/MultiStnData'
        let data = {
            'bbox': [-114.8154, 31.32917, -109.0449, 37.00459],
            'sdate': start_date,
            'edate': end_date,
            'elems': 'pcpn',
            'meta': "name,ll"
        }
        let httpOptions = {
            headers: new HttpHeaders({ 'Content-Type': 'application/json' })
        };
        return this.http.post(url, data, httpOptions)
    }
      
    getRainlogData(start_date, end_date, limit=1000, i=0) {
        let url = 'https://rainlog.org/api/1.0/Reading/getFiltered'
        let data = {
            "quality": ["Good"],
            "pagination": {
                "offset": i,
                "limit": limit,
            },
            "dateRangeStart": start_date,
            "dateRangeEnd": end_date,
            "region": {
                "type": "Rectangle",
                "westLng": -114.8154,
                "eastLng": -109.0449,
                "northLat": 31.32917,
                "southLat": 37.00459
            }
        }
        let httpOptions = {
            headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
        };
        return this.http.post(url, data, httpOptions)
    }

    getRainlogGauges(start_date, end_date, limit=1000, i=0) {
        let url = 'https://rainlog.org/api/1.0/GaugeRevision/getFiltered'
        let data = {
            "pagination": {
                "offset": i,
                "limit": limit,
            },
            "dateRangeStart": start_date,
            "dateRangeEnd": end_date,
            "region": {
                "type": "Rectangle",
                "westLng": -114.8154,
                "eastLng": -109.0449,
                "northLat": 31.32917,
                "southLat": 37.00459
            }
        }
        let httpOptions = {
            headers: new HttpHeaders({ 'Content-Type': 'application/json' })
        };
        return this.http.post(url, data, httpOptions)
    }
    
}
