function DrawEagleField(pos)
{
    if(pos !== undefined && pos[0] !== undefined && pos[1] !== undefined)
    {

        cx = s * pos[0] + s/2;
        cy = s * pos[1] + s/2;
        
        ctx.closePath()
        ctx.fillStyle = "#80400080";
        ctx.beginPath();
        ctx.arc(cx, cy, s/2, 0, 2 * Math.PI);
        ctx.closePath()
        ctx.fill();
        
        ctx.fillStyle = "#00000040";
        ctx.beginPath();
        ctx.arc(cx, cy, s/4, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function DrawPlayer(pos,dir)
{
    ctx.fillStyle = "magenta";
    if(pos !== undefined && pos[0] !== undefined && pos[1] !== undefined)
    {
        cx = pos[0] * s + s/2;
        cy = pos[1] * s + s/2;
    
        ctx.beginPath();
        ctx.arc(cx, cy, s/3, 0, 2 * Math.PI);
        ctx.fill();
        if(dir !== undefined)
        {
            DrawArrow(pos[0],pos[1],dir);
        }
    }
}

function DrawLembas(pos)
{
    cx = s * pos[0] + s/2;
    cy = s * pos[1] + s/2;
    
    as = s/4;

    ctx.strokeStyle = "#aaaa40";
    ctx.fillStyle = "#eeee80";
    if(pos !== undefined && pos[0] !== undefined && pos[1] !== undefined)
    {
        
        ctx.beginPath();
        ctx.moveTo(cx - as, cy - as);
        ctx.lineTo(cx + as, cy - as);
        ctx.lineTo(cx + as, cy + as);
        ctx.lineTo(cx - as, cy + as);
        ctx.closePath();
        ctx.fill();
        //ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - as, cy - as)
        ctx.lineTo(cx + as, cy + as);
        ctx.moveTo(cx + as, cy - as);
        ctx.lineTo(cx - as, cy + as);
        ctx.closePath();
        ctx.stroke();
    }
}

function UpdateBoard(bc)
{
    let h = bc.height;
    let w = bc.width;

    c.width = s * w;
    c.height = s * h;

    for(let x = 0; x < w; x++)
    {
        for(let y = 0; y < h; y++)
        {
            if(x % 2 == y % 2)
            {
                ctx.fillStyle = "#EEE";
            }
            else
            {
                ctx.fillStyle = "#CCC";
            }
            
            ctx.fillRect(x * s, y * s, s, s);
            
            ctx.fillStyle = "black";
            ctx.textAlign = "right";
            ctx.textBaseline = 'middle';
            ctx.fillText(`(${x}, ${y})`, x * s + s, y * s + s - 5);
        }
    }

    for(sf of bc.startFields)
    {
        pos = sf.position;
        dir = sf.direction;
        
        ctx.fillStyle = "#ffff0080";
        
        if(pos !== undefined && pos[0] !== undefined && pos[1] !== undefined)
        {
            ctx.fillRect(pos[0] * s, pos[1] * s, s, s);
            
            if(dir)
            {
                DrawArrow(pos[0], pos[1], dir);
            }
        }
    }

    for(cp of bc.checkPoints)
    {
        ctx.fillStyle = "#00ffff80";
        if(cp[0] !== undefined && cp[1] !== undefined)
        {
            //ctx.fillRect(cp[0] * s, cp[1] * s, s, s);
            ctx.beginPath();
            ctx.arc((0.5 + cp[0]) * s, (0.5 + cp[1]) * s, s/4, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    let ep = bc.eye.position;
    let ed = bc.eye.direction;

    ctx.fillStyle = "#ff800080";
    if(ep !== undefined && ep[0] !== undefined && ep[1] !== undefined)
    {
        //ctx.fillRect(ep[0] * s, ep[1] * s, s, s)
        ctx.beginPath();
        ctx.arc((0.5 + ep[0]) * s, (0.5 + ep[1]) * s, s/2, 0, 2 * Math.PI);
        ctx.fill();
        if(ed !== undefined)
        {
            DrawArrow(ep[0],ep[1],ed);
        }
    }

    for(h of bc.holes)
    {
        ctx.fillStyle = "#00000080";
        if(h[0] !== undefined && h[1] !== undefined)
        {
            ctx.fillRect(h[0] * s, h[1] * s, s, s);
        }
    }

    for(rf of bc.riverFields)
    {
        pos = rf.position;
        dir = rf.direction;
        
        ctx.fillStyle = "#0000ff80";
        
        if(pos !== undefined && pos[0] !== undefined && pos[1] !== undefined)
        {
            ctx.fillRect(pos[0] * s, pos[1] * s, s, s);
            
            if(dir)
            {
                DrawArrow(pos[0], pos[1], dir);
            }
        }
    }

    for(wall of bc.walls)
    {
        ctx.fillStyle = "#ff000080";
        
        let ax = wall[0][0]
        let ay = wall[0][1]
        let bx = wall[1][0]
        let by = wall[1][1]
        
        if(ax !== undefined && ay !== undefined && bx !== undefined && by !== undefined)
        {
            wt = s/4
        
            if(ax == bx && Math.abs(ay - by) == 1)
            {
                let x = ax;
                let y = ay > by ? ay : by;
                ctx.fillRect(x * s, y * s - (wt/2), s, wt);
            }
            else if(ay == ay && Math.abs(ax - bx) == 1)
            {
                let y = ay;
                let x = ax > bx ? ax : bx;
                ctx.fillRect(x * s - (wt/2), y * s, wt, s);
            }
        }
    }

    for(lf of bc.lembasFields)
    {
        pos = lf.position;
        amo = lf.amount;
        
        ctx.fillStyle = "#80ff0080";
        
        if(pos !== undefined && pos[0] !== undefined && pos[1] !== undefined)
        {
            ctx.fillRect(pos[0] * s, pos[1] * s, s, s);

            DrawLembas(pos);

            if(amo !== undefined)
            {
                    ctx.fillStyle = "#000000ff";
                    ctx.textAlign = "center";
                    ctx.textBaseline = 'middle';
                    ctx.font = "20px Arial";
                    ctx.fillText(amo, (0.5 + pos[0]) * s, (0.5 + pos[1]) * s);
            }
            
        }

    }

    for(ef of bc.eagleFields)
    {
    
        DrawEagleField(ef);
        /*
        ctx.fillStyle = "#80400080";
        
        if(ef[0] !== undefined && ef[1] !== undefined)
        {
            ctx.fillRect(ef[0] * s, ef[1] * s, s, s);
        }
        */
    }

}

function DrawArrow(x,y,d)
{
    cx = s * x + s/2;
    cy = s * y + s/2;
    
    as = s/8;
    
    ctx.fillStyle = "#00000020";
    ctx.strokeStyle = "#00000080";

    switch (d)
    {
        case Direction.NORTH:
        
            ctx.beginPath();
            ctx.moveTo(cx - as, cy + as);
            ctx.lineTo(cx, cy - as);
            ctx.lineTo(cx + as, cy + as);
            ctx.closePath();
            //ctx.stroke();
            ctx.fill();
            break;
        case Direction.EAST:
        
            ctx.beginPath();
            ctx.moveTo(cx - as, cy - as);
            ctx.lineTo(cx + as, cy);
            ctx.lineTo(cx - as, cy + as);
            ctx.closePath();
            //ctx.stroke();
            ctx.fill();
            break;
        case Direction.SOUTH:
        
            ctx.beginPath();
            ctx.moveTo(cx - as, cy - as);
            ctx.lineTo(cx, cy + as);
            ctx.lineTo(cx + as, cy - as);
            ctx.closePath();
            //ctx.stroke();
            ctx.fill();
            break;
        case Direction.WEST:
        
            ctx.beginPath();
            ctx.moveTo(cx + as, cy - as);
            ctx.lineTo(cx - as, cy);
            ctx.lineTo(cx + as, cy + as);
            ctx.closePath();
            //ctx.stroke();
            ctx.fill();
            break;
   
    }
    
}